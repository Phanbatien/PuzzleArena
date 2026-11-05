using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Boosters;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;

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

    private static async Task<IResult> Grant(GrantRequest? body, AppDb db, IBoosterService boosters)
    {
        if (body is null || body.Amount < 1 || body.Amount > 100)
            return ApiResults.Error("Số lượng bổ trợ phải từ 1 đến 100.", StatusCodes.Status400BadRequest);
        if (!Enum.IsDefined(body.Type))
            return ApiResults.Error("Loại bổ trợ không hợp lệ.", StatusCodes.Status400BadRequest);

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == body.UserId);
        if (user is null)
            return ApiResults.Error("Không tìm thấy người dùng.", StatusCodes.Status404NotFound);

        db.BoosterGrants.Add(new BoosterGrant
        {
            UserId = user.Id,
            Type = body.Type,
            Amount = body.Amount,
            Reason = "admin",
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        var balance = await boosters.Balance(user.Id, body.Type);
        return Results.Ok(new BoosterBalanceResponse(body.Type, balance));
    }

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
