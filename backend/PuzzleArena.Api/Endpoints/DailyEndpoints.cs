using PuzzleArena.Business.Daily;

namespace PuzzleArena.Api.Endpoints;

public static class DailyEndpoints
{
    public static void MapDailyEndpoints(this WebApplication app)
    {
        // GET /api/daily?game=Sudoku -> 3 thẻ Dễ / Vừa / Khó. Bắt đầu ván: POST /api/daily/start (AttemptEndpoints).
        app.MapGet("/api/daily", async (string? game, HttpContext http, DailyService daily, CancellationToken ct) =>
            AuthEndpoints.CurrentUserId(http) is { } userId ? ApiResults.From(await daily.GetDaily(userId, game, ct)) : ApiResults.Unauthorized())
            .RequireAuthorization();
    }
}
