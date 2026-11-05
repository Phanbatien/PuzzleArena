using PuzzleArena.Business.Profile;

namespace PuzzleArena.Api.Endpoints;

public static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this WebApplication app)
    {
        var me = app.MapGroup("/api/me").RequireAuthorization();

        me.MapGet("/ratings", async (HttpContext http, ProfileService profile, CancellationToken ct) =>
            AuthEndpoints.CurrentUserId(http) is { } userId ? Results.Ok(await profile.Ratings(userId, ct)) : ApiResults.Unauthorized());

        me.MapGet("/missions", async (HttpContext http, ProfileService profile, CancellationToken ct) =>
            AuthEndpoints.CurrentUserId(http) is { } userId ? Results.Ok(await profile.Missions(userId, ct)) : ApiResults.Unauthorized());

        me.MapGet("/history", async (HttpContext http, ProfileService profile, CancellationToken ct) =>
            AuthEndpoints.CurrentUserId(http) is { } userId ? Results.Ok(await profile.History(userId, ct)) : ApiResults.Unauthorized());
    }
}
