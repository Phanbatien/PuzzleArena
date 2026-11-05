using System.Globalization;
using PuzzleArena.Business.Contracts;
using PuzzleArena.Business.Rating;

namespace PuzzleArena.Business.Profile;

/// <summary>Hồ sơ (BE1): điểm hạng từng game, nhiệm vụ ngày / tuần, lịch sử 50 lượt gần nhất.</summary>
public sealed class ProfileService(AppDb db)
{
    public async Task<RatingResponse[]> Ratings(int userId, CancellationToken ct = default)
    {
        var rows = await db.UserRatings.AsNoTracking().Where(r => r.UserId == userId).ToListAsync(ct);

        RatingResponse Map(GameType game)
        {
            var value = rows.FirstOrDefault(r => r.GameType == game)?.Value ?? Elo.Initial;
            return new RatingResponse(game, value, Elo.RankName(value), Elo.NextMilestone(value), Elo.SuggestedDifficulty(value));
        }

        return [Map(GameType.Sudoku), Map(GameType.Minesweeper)];
    }

    public async Task<MissionResponse[]> Missions(int userId, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var now = DateTime.UtcNow;
        var isoYear = ISOWeek.GetYear(now);
        var isoWeek = ISOWeek.GetWeekOfYear(now);

        var finished = await db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId && a.Status == AttemptStatus.Solved && a.TournamentId == null && a.FinishedAt != null)
            .Join(db.Puzzles.Where(p => p.IsDaily), a => a.PuzzleId, p => p.Id, (a, _) => a.FinishedAt!.Value)
            .ToListAsync(ct);

        var dailyCount = finished.Count(t => DateOnly.FromDateTime(t.UtcDateTime) == today);
        var weeklyCount = finished.Count(t =>
            ISOWeek.GetYear(t.UtcDateTime) == isoYear && ISOWeek.GetWeekOfYear(t.UtcDateTime) == isoWeek);

        var dailyReason = $"daily:{today:yyyy-MM-dd}";
        var weeklyReason = $"weekly:{isoYear}-W{isoWeek:00}";
        var reasons = await db.BoosterGrants.AsNoTracking()
            .Where(g => g.UserId == userId && (g.Reason == dailyReason || g.Reason == weeklyReason))
            .Select(g => g.Reason)
            .ToListAsync(ct);

        var dailyProgress = Math.Min(dailyCount, 1);
        var weeklyProgress = Math.Min(weeklyCount, 5);
        return
        [
            new MissionResponse("daily", "Daily", "Giải 1 đề daily hôm nay", dailyProgress, 1, dailyProgress >= 1,
                BoosterType.Hint, 1, reasons.Contains(dailyReason)),
            new MissionResponse("weekly", "Weekly", "Giải 5 đề daily trong tuần", weeklyProgress, 5, weeklyProgress >= 5,
                BoosterType.Shield, 1, reasons.Contains(weeklyReason)),
        ];
    }

    public async Task<List<HistoryResponse>> History(int userId, CancellationToken ct = default)
    {
        // Sắp xếp sau khi tải: SQLite (chạy dev) không ORDER BY được DateTimeOffset.
        var attempts = (await db.Attempts.AsNoTracking().Include(a => a.Puzzle).Where(a => a.UserId == userId).ToListAsync(ct))
            .OrderByDescending(a => a.StartedAt)
            .Take(50)
            .ToList();
        var ids = attempts.Select(a => a.Id).ToList();
        var deltas = await db.AttemptRatings.AsNoTracking()
            .Where(r => ids.Contains(r.AttemptId))
            .ToDictionaryAsync(r => r.AttemptId, r => r.Delta, ct);

        return attempts.Select(a => new HistoryResponse(
            a.Id, a.Puzzle.GameType, a.Puzzle.Difficulty, a.StartedAt, a.DurationMs, a.Mistakes, a.Status,
            deltas.TryGetValue(a.Id, out var delta) ? delta : null)).ToList();
    }
}
