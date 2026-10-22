using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Boosters;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

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

    private static async Task<IResult> UseHint(int id, HttpContext http, AppDb db, IBoosterService boosters)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null)
            return ApiResults.Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);

        var attempt = await db.Attempts.FirstOrDefaultAsync(a => a.Id == id);
        if (attempt is null)
            return ApiResults.Error("Không tìm thấy lượt chơi.", StatusCodes.Status404NotFound);
        if (attempt.UserId != userId)
            return ApiResults.Error("Bạn không có quyền thực hiện thao tác này.", StatusCodes.Status403Forbidden);
        if (attempt.TournamentId is not null)
            return ApiResults.Error("Không dùng bổ trợ trong giải đấu.", StatusCodes.Status400BadRequest);
        if (attempt.Status != AttemptStatus.InProgress)
            return ApiResults.Error("Lượt chơi đã kết thúc.", StatusCodes.Status400BadRequest);
        if (await boosters.Balance(userId.Value, BoosterType.Hint) < 1)
            return ApiResults.Error("Bạn không còn Gợi ý.", StatusCodes.Status400BadRequest);

        // BE2 reveals one cell via Apply. Until that exists, do not spend the hint.
        return ApiResults.Error("Gợi ý chưa nối với bàn chơi.", StatusCodes.Status501NotImplemented);
    }
}
