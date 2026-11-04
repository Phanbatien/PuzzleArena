using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Endpoints;

/// <summary>
/// Bảng xếp hạng chung (BE3), tính từ dữ liệu của BE1: điểm hạng (UserRating) và các lượt daily đã giải.
/// Đọc nhiều hơn ghi rất nhiều nên cache 5 giây (Redis nếu có ConnectionStrings:Redis, không thì bộ nhớ).
/// </summary>
public static class LeaderboardEndpoints
{
    private const int Top = 50;
    private static readonly TimeSpan CacheFor = TimeSpan.FromSeconds(5);

    public static void MapLeaderboardEndpoints(this WebApplication app)
    {
        app.MapGet("/api/leaderboard/rating", Rating);
        app.MapGet("/api/leaderboard/daily", Daily);
    }

    private static async Task<IResult> Rating(string? game, AppDb db, IDistributedCache cache, CancellationToken ct)
    {
        if (!TryGame(game, out var gameType))
            return ApiResults.Error("Loại game không hợp lệ.", StatusCodes.Status400BadRequest);

        var rows = await Cached(cache, $"lb:rating:{gameType}", async () =>
        {
            var ratings = await db.UserRatings.AsNoTracking()
                .Where(r => r.GameType == gameType && !r.User.IsLocked)
                .OrderByDescending(r => r.Value).ThenBy(r => r.UserId)
                .Take(Top)
                .Select(r => new { r.UserId, r.User.Username, r.Value })
                .ToListAsync(ct);

            var ids = ratings.Select(r => r.UserId).ToList();
            var solved = await db.Attempts.AsNoTracking()
                .Where(a => ids.Contains(a.UserId) && a.Status == AttemptStatus.Solved
                    && a.TournamentId == null && a.Puzzle.IsDaily && a.Puzzle.GameType == gameType)
                .GroupBy(a => a.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);

            return ratings
                .Select((r, i) => new RatingLeaderboardRow(i + 1, r.UserId, r.Username, r.Value, solved.GetValueOrDefault(r.UserId)))
                .ToList();
        }, ct);
        return Results.Ok(rows);
    }

    // period = day (hôm nay) | week (tuần ISO hiện tại, từ thứ Hai).
    // Điểm = tổng Elo kiếm được từ các lượt daily trong kỳ (giải hỏng thì âm). Daily chơi không giới hạn,
    // nên không đếm số đề: rating càng cao thì đề dễ cho càng ít điểm, cày đề dễ không lên top được.
    private static async Task<IResult> Daily(string? game, string? period, AppDb db, IDistributedCache cache, CancellationToken ct)
    {
        if (!TryGame(game, out var gameType))
            return ApiResults.Error("Loại game không hợp lệ.", StatusCodes.Status400BadRequest);
        period ??= "day";
        if (period is not ("day" or "week"))
            return ApiResults.Error("period phải là day hoặc week.", StatusCodes.Status400BadRequest);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var from = period == "week" ? today.AddDays(-(((int)today.DayOfWeek + 6) % 7)) : today;

        var rows = await Cached(cache, $"lb:daily:{gameType}:{period}:{from:yyyyMMdd}", async () =>
        {
            var played = await db.AttemptRatings.AsNoTracking()
                .Where(r => r.Attempt.TournamentId == null
                    && r.Attempt.Puzzle.IsDaily && r.Attempt.Puzzle.GameType == gameType
                    && r.Attempt.Puzzle.DailyDate >= from && r.Attempt.Puzzle.DailyDate <= today
                    && !r.Attempt.User.IsLocked)
                .Select(r => new
                {
                    r.UserId,
                    r.Attempt.User.Username,
                    r.Delta,
                    Solved = r.Attempt.Status == AttemptStatus.Solved,
                    r.Attempt.DurationMs,
                    r.Attempt.Mistakes,
                })
                .ToListAsync(ct);

            return played
                .GroupBy(a => (a.UserId, a.Username))
                .Select(g => new
                {
                    g.Key.UserId,
                    g.Key.Username,
                    Score = g.Sum(a => a.Delta),
                    Solved = g.Count(a => a.Solved),
                    Duration = g.Where(a => a.Solved).Sum(a => a.DurationMs ?? 0),
                    Mistakes = g.Sum(a => a.Mistakes),
                })
                .OrderByDescending(x => x.Score).ThenByDescending(x => x.Solved).ThenBy(x => x.Duration).ThenBy(x => x.UserId)
                .Take(Top)
                .Select((x, i) => new DailyLeaderboardRow(i + 1, x.UserId, x.Username, x.Score, x.Solved, x.Duration, x.Mistakes))
                .ToList();
        }, ct);
        return Results.Ok(rows);
    }

    private static bool TryGame(string? game, out GameType gameType)
    {
        gameType = default;
        return !string.IsNullOrWhiteSpace(game) && Enum.TryParse(game, ignoreCase: false, out gameType);
    }

    private static async Task<List<T>> Cached<T>(IDistributedCache cache, string key, Func<Task<List<T>>> load, CancellationToken ct)
    {
        if (await cache.GetStringAsync(key, ct) is { } hit)
            return JsonSerializer.Deserialize<List<T>>(hit, ApiJson.Options)!;

        var rows = await load();
        await cache.SetStringAsync(key, JsonSerializer.Serialize(rows, ApiJson.Options),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = CacheFor }, ct);
        return rows;
    }
}
