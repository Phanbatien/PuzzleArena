using PuzzleArena.Business.Boosters;
using PuzzleArena.Business.Contracts;
using PuzzleArena.DataAccess.Domain;
using PuzzleArena.Business.Games;

namespace PuzzleArena.Api.Endpoints;

public static class BoosterEndpoints
{
    public static void MapBoosterEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/boosters").RequireAuthorization();
        group.MapGet("/", GetBoosters);
        group.MapPost("/grant", Grant).RequireAuthorization(policy => policy.RequireRole(nameof(Role.Admin)));

        app.MapPost("/api/attempts/{id:int}/hint", UseHint).RequireAuthorization();
    }

    private static async Task<IResult> GetBoosters(HttpContext http, IBoosterService boosters)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null)
            return ApiResults.Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);

        return Results.Ok(await boosters.GetBalances(userId.Value));
    }

    private static async Task<IResult> Grant(GrantRequest? body, IBoosterService boosters, CancellationToken ct) =>
        ApiResults.From(await boosters.Grant(body, ct));

    // Điền giúp một ô đúng (AttemptService.UseHint). Trả về giống /move để FE cập nhật bàn chơi.
    private static async Task<IResult> UseHint(int id, HttpContext http, AttemptService attempts, CancellationToken ct)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null)
            return ApiResults.Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);

        var result = await attempts.UseHint(userId.Value, id, ct);
        if (result.Error is not null)
            return ApiResults.Error(result.Error, result.Status);

        return Results.Ok(new MoveResponse(Correct: true, Shielded: false, await attempts.ToResponse(result.Attempt!, ct)));
    }
}
