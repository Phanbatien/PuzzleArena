using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Games;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Api.Endpoints;

public static class DailyEndpoints
{
    private static readonly Difficulty[] Difficulties = [Difficulty.Easy, Difficulty.Medium, Difficulty.Hard];

    public static void MapDailyEndpoints(this WebApplication app)
    {
        app.MapGet("/api/daily", GetDaily).RequireAuthorization();
    }

    private static async Task<IResult> GetDaily(
        string? game,
        HttpContext http,
        AppDb db,
        IPuzzleGenerator generator)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null)
            return ApiResults.Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);

        if (string.IsNullOrWhiteSpace(game) || !Enum.TryParse<GameType>(game, ignoreCase: false, out var gameType))
            return ApiResults.Error("Loại game không hợp lệ.", StatusCodes.Status400BadRequest);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var puzzles = await EnsureDaily(db, generator, gameType, today);

        var rating = await db.UserRatings.AsNoTracking()
            .Where(r => r.UserId == userId && r.GameType == gameType)
            .Select(r => (int?)r.Value)
            .FirstOrDefaultAsync() ?? Elo.Initial;

        var puzzleIds = puzzles.Select(p => p.Id).ToList();
        var attempts = (await db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId && puzzleIds.Contains(a.PuzzleId))
            .ToListAsync())
            .OrderByDescending(a => a.StartedAt)
            .ToList();

        var response = puzzles.Select(puzzle =>
        {
            var attempt = attempts.FirstOrDefault(a => a.PuzzleId == puzzle.Id);
            var puzzleRating = Elo.PuzzleRating(puzzle.Difficulty);
            return new DailyPuzzleResponse(
                puzzle.Id,
                puzzle.GameType,
                puzzle.Difficulty,
                puzzle.DailyDate ?? today,
                Elo.Delta(rating, puzzleRating, won: true),
                Elo.Delta(rating, puzzleRating, won: false),
                attempt is null ? "NotStarted" : attempt.Status.ToString(),
                attempt?.Id);
        });

        return Results.Ok(response);
    }

    private static async Task<List<Entities.Puzzle>> EnsureDaily(
        AppDb db,
        IPuzzleGenerator generator,
        GameType game,
        DateOnly today)
    {
        var existing = await db.Puzzles
            .Where(p => p.IsDaily && p.DailyDate == today && p.GameType == game)
            .ToListAsync();
        if (existing.Count >= Difficulties.Length)
            return Order(existing);

        foreach (var difficulty in Difficulties)
        {
            if (existing.Any(p => p.Difficulty == difficulty))
                continue;

            var puzzle = generator.Generate(game, difficulty, DailySeed.For(today, game, difficulty));
            puzzle.IsDaily = true;
            puzzle.DailyDate = today;
            db.Puzzles.Add(puzzle);
        }

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
        }

        var rows = await db.Puzzles
            .Where(p => p.IsDaily && p.DailyDate == today && p.GameType == game)
            .ToListAsync();
        return Order(rows);
    }

    private static List<Entities.Puzzle> Order(List<Entities.Puzzle> puzzles) =>
        puzzles.OrderBy(p => Array.IndexOf(Difficulties, p.Difficulty)).ToList();
}
