using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Boosters;

public interface IBoosterService
{
    Task<IReadOnlyList<BoosterBalanceResponse>> GetBalances(int userId, CancellationToken ct = default);
    Task<int> Balance(int userId, BoosterType type, CancellationToken ct = default);
    Task<bool> TryConsume(int userId, BoosterType type, int attemptId, CancellationToken ct = default);
}

public sealed class BoosterService(AppDb db) : IBoosterService
{
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
