using PuzzleArena.Business.Leaderboard;

namespace PuzzleArena.Api.Endpoints;

/// <summary>Bảng xếp hạng chung (BE3). Logic và cache ở LeaderboardService (lớp Business).</summary>
public static class LeaderboardEndpoints
{
    public static void MapLeaderboardEndpoints(this WebApplication app)
    {
        app.MapGet("/api/leaderboard/rating", async (string? game, LeaderboardService leaderboard, CancellationToken ct) =>
            ApiResults.From(await leaderboard.Rating(game, ct)));

        app.MapGet("/api/leaderboard/daily", async (string? game, string? period, LeaderboardService leaderboard, CancellationToken ct) =>
            ApiResults.From(await leaderboard.Daily(game, period, ct)));
    }
}
