using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Api.Endpoints;

public static class DailyEndpoints
{
    private static readonly Difficulty[] Difficulties = [Difficulty.Easy, Difficulty.Medium, Difficulty.Hard];

    public static void MapDailyEndpoints(this WebApplication app)
    {
        app.MapGet("/api/daily", GetDaily).RequireAuthorization();
    }

    private static async Task<IResult> GetDaily(string? game, HttpContext http, AppDb db)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null)
            return ApiResults.Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);

        if (string.IsNullOrWhiteSpace(game) || !Enum.TryParse<GameType>(game, ignoreCase: false, out var gameType))
            return ApiResults.Error("Loại game không hợp lệ.", StatusCodes.Status400BadRequest);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var rating = await db.UserRatings.AsNoTracking()
            .Where(r => r.UserId == userId && r.GameType == gameType)
            .Select(r => (int?)r.Value)
            .FirstOrDefaultAsync() ?? Elo.Initial;

        // Lượt daily của người này: đang dở (mọi ngày) và đã chơi hôm nay.
        var attempts = await db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId && a.TournamentId == null && a.Puzzle.IsDaily && a.Puzzle.GameType == gameType
                && (a.Status == AttemptStatus.InProgress || a.Puzzle.DailyDate == today))
            .Select(a => new { a.Id, a.Status, a.Puzzle.Difficulty, a.Puzzle.DailyDate })
            .ToListAsync();

        var response = Difficulties.Select(difficulty =>
        {
            var mine = attempts.Where(a => a.Difficulty == difficulty).ToList();
            var playing = mine.Where(a => a.Status == AttemptStatus.InProgress).MaxBy(a => a.Id);
            var puzzleRating = Elo.PuzzleRating(difficulty);
            return new DailyPuzzleResponse(
                gameType,
                difficulty,
                today,
                Elo.Delta(rating, puzzleRating, won: true),
                Elo.Delta(rating, puzzleRating, won: false),
                playing is null ? "NotStarted" : nameof(AttemptStatus.InProgress),
                playing?.Id,
                mine.Count(a => a.DailyDate == today),
                mine.Count(a => a.DailyDate == today && a.Status == AttemptStatus.Solved));
        });

        return Results.Ok(response);
    }
}
