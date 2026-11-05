using Microsoft.EntityFrameworkCore;
using PuzzleArena.Business.Contracts;
using PuzzleArena.DataAccess;
using PuzzleArena.DataAccess.Domain;
using PuzzleArena.DataAccess.Entities;

namespace PuzzleArena.Business.Boosters;

public interface IBoosterService
{
    Task<IReadOnlyList<BoosterBalanceResponse>> GetBalances(int userId, CancellationToken ct = default);
    Task<int> Balance(int userId, BoosterType type, CancellationToken ct = default);
    Task<bool> TryConsume(int userId, BoosterType type, int attemptId, CancellationToken ct = default);
    Task<ServiceResult<BoosterBalanceResponse>> Grant(GrantRequest? body, CancellationToken ct = default);
}

public sealed class BoosterService(AppDb db) : IBoosterService
{
    // Admin trao bổ trợ cho một người (1..100 mỗi lần).
    public async Task<ServiceResult<BoosterBalanceResponse>> Grant(GrantRequest? body, CancellationToken ct = default)
    {
        if (body is null || body.Amount < 1 || body.Amount > 100)
            return ServiceResult<BoosterBalanceResponse>.Fail(StatusCodes.Status400BadRequest, "Số lượng bổ trợ phải từ 1 đến 100.");
        if (!Enum.IsDefined(body.Type))
            return ServiceResult<BoosterBalanceResponse>.Fail(StatusCodes.Status400BadRequest, "Loại bổ trợ không hợp lệ.");
        if (!await db.Users.AnyAsync(u => u.Id == body.UserId, ct))
            return ServiceResult<BoosterBalanceResponse>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy người dùng.");

        db.BoosterGrants.Add(new BoosterGrant
        {
            UserId = body.UserId,
            Type = body.Type,
            Amount = body.Amount,
            Reason = "admin",
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return ServiceResult<BoosterBalanceResponse>.Ok(new BoosterBalanceResponse(body.Type, await Balance(body.UserId, body.Type, ct)));
    }

    public async Task<IReadOnlyList<BoosterBalanceResponse>> GetBalances(int userId, CancellationToken ct = default)
    {
        var hint = await Balance(userId, BoosterType.Hint, ct);
        var shield = await Balance(userId, BoosterType.Shield, ct);
        return
        [
            new BoosterBalanceResponse(BoosterType.Hint, hint),
            new BoosterBalanceResponse(BoosterType.Shield, shield),
        ];
    }

    public async Task<int> Balance(int userId, BoosterType type, CancellationToken ct = default)
    {
        return await db.BoosterGrants
            .Where(g => g.UserId == userId && g.Type == type)
            .SumAsync(g => g.Amount, ct);
    }

    public async Task<bool> TryConsume(int userId, BoosterType type, int attemptId, CancellationToken ct = default)
    {
        var attempt = await db.Attempts.FirstOrDefaultAsync(a => a.Id == attemptId, ct);
        if (attempt is null || attempt.UserId != userId || attempt.TournamentId is not null)
            return false;

        var reason = $"{type.ToString().ToLowerInvariant()}:{attemptId}";
        if (await db.BoosterGrants.AnyAsync(g => g.UserId == userId && g.Reason == reason, ct))
            return true;

        if (await Balance(userId, type, ct) < 1)
            return false;

        db.BoosterGrants.Add(new BoosterGrant
        {
            UserId = userId,
            Type = type,
            Amount = -1,
            Reason = reason,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return true;
    }
}
