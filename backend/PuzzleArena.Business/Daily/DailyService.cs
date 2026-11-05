using PuzzleArena.Business.Contracts;
using PuzzleArena.Business.Rating;

namespace PuzzleArena.Business.Daily;

/// <summary>
/// Daily (BE1): 3 thẻ Dễ / Vừa / Khó cho mỗi game, kèm điểm Elo được/mất, lượt đang dở và số ván hôm nay.
/// Chơi không giới hạn: bắt đầu ván mới là AttemptService.StartDaily (mỗi ván một đề ngẫu nhiên riêng).
/// </summary>
public sealed class DailyService(AppDb db)
{
    private static readonly Difficulty[] Difficulties = [Difficulty.Easy, Difficulty.Medium, Difficulty.Hard];

    public async Task<ServiceResult<List<DailyPuzzleResponse>>> GetDaily(int userId, string? game, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(game) || !Enum.TryParse<GameType>(game, ignoreCase: false, out var gameType))
            return ServiceResult<List<DailyPuzzleResponse>>.Fail(StatusCodes.Status400BadRequest, "Loại game không hợp lệ.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var rating = await db.UserRatings.AsNoTracking()
            .Where(r => r.UserId == userId && r.GameType == gameType)
            .Select(r => (int?)r.Value)
            .FirstOrDefaultAsync(ct) ?? Elo.Initial;

        // Lượt daily của người này: đang dở (mọi ngày) và đã chơi hôm nay.
        var attempts = await db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId && a.TournamentId == null && a.Puzzle.IsDaily && a.Puzzle.GameType == gameType
                && (a.Status == AttemptStatus.InProgress || a.Puzzle.DailyDate == today))
            .Select(a => new { a.Id, a.Status, a.Puzzle.Difficulty, a.Puzzle.DailyDate })
            .ToListAsync(ct);

        var cards = Difficulties.Select(difficulty =>
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
        }).ToList();
        return ServiceResult<List<DailyPuzzleResponse>>.Ok(cards);
    }
}
