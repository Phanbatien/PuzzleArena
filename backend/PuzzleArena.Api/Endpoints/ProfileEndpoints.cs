using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Api.Endpoints;

public static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this WebApplication app)
    {
        var me = app.MapGroup("/api/me").RequireAuthorization();
        me.MapGet("/ratings", Ratings);
        me.MapGet("/missions", Missions);
        me.MapGet("/history", History);
    }

    private static async Task<IResult> Ratings(HttpContext http, AppDb db)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null)
            return ApiResults.Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);

        var rows = await db.UserRatings.AsNoTracking()
            .Where(r => r.UserId == userId)
            .ToListAsync();

        RatingResponse Map(GameType game)
        {
            var value = rows.FirstOrDefault(r => r.GameType == game)?.Value ?? Elo.Initial;
            return new RatingResponse(
                game,
                value,
                Elo.RankName(value),
                Elo.NextMilestone(value),
                Elo.SuggestedDifficulty(value));
        }

        return Results.Ok(new[] { Map(GameType.Sudoku), Map(GameType.Minesweeper) });
    }

    private static async Task<IResult> Missions(HttpContext http, AppDb db)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null)
            return ApiResults.Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var now = DateTime.UtcNow;
        var isoYear = ISOWeek.GetYear(now);
        var isoWeek = ISOWeek.GetWeekOfYear(now);

        var finished = await db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId
                && a.Status == AttemptStatus.Solved
                && a.TournamentId == null
                && a.FinishedAt != null)
            .Join(db.Puzzles.Where(p => p.IsDaily), a => a.PuzzleId, p => p.Id, (a, _) => a.FinishedAt!.Value)
            .ToListAsync();

        var dailyCount = finished.Count(t => DateOnly.FromDateTime(t.UtcDateTime) == today);
        var weeklyCount = finished.Count(t =>
            ISOWeek.GetYear(t.UtcDateTime) == isoYear && ISOWeek.GetWeekOfYear(t.UtcDateTime) == isoWeek);

        var dailyReason = $"daily:{today:yyyy-MM-dd}";
        var weeklyReason = $"weekly:{isoYear}-W{isoWeek:00}";
        var reasons = await db.BoosterGrants.AsNoTracking()
            .Where(g => g.UserId == userId && (g.Reason == dailyReason || g.Reason == weeklyReason))
            .Select(g => g.Reason)
            .ToListAsync();

        var dailyProgress = Math.Min(dailyCount, 1);
        var weeklyProgress = Math.Min(weeklyCount, 5);
        return Results.Ok(new[]
        {
            new MissionResponse(
                "daily",
                "Daily",
                "Giải 1 đề daily hôm nay",
                dailyProgress,
                1,
                dailyProgress >= 1,
                BoosterType.Hint,
                1,
                reasons.Contains(dailyReason)),
            new MissionResponse(
                "weekly",
                "Weekly",
                "Giải 5 đề daily trong tuần",
                weeklyProgress,
                5,
                weeklyProgress >= 5,
                BoosterType.Shield,
                1,
                reasons.Contains(weeklyReason)),
        });
    }

    private static async Task<IResult> History(HttpContext http, AppDb db)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null)
            return ApiResults.Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);

        var attempts = (await db.Attempts.AsNoTracking()
            .Include(a => a.Puzzle)
            .Where(a => a.UserId == userId)
            .ToListAsync())
            .OrderByDescending(a => a.StartedAt)
            .Take(50)
            .ToList();
        var ids = attempts.Select(a => a.Id).ToList();
        var deltas = await db.AttemptRatings.AsNoTracking()
            .Where(r => ids.Contains(r.AttemptId))
            .ToDictionaryAsync(r => r.AttemptId, r => r.Delta);

        var response = attempts.Select(a => new HistoryResponse(
            a.Id,
            a.Puzzle.GameType,
            a.Puzzle.Difficulty,
            a.StartedAt,
            a.DurationMs,
            a.Mistakes,
            a.Status,
            deltas.TryGetValue(a.Id, out var delta) ? delta : null));
        return Results.Ok(response);
    }
}
