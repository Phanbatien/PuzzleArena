using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Rating;

public interface IRatingService
{
    Task<int?> ApplyResult(int userId, int attemptId, bool won, CancellationToken ct = default);
}

public sealed class RatingService(AppDb db) : IRatingService
{
    public async Task<int?> ApplyResult(int userId, int attemptId, bool won, CancellationToken ct = default)
    {
        var attempt = await db.Attempts.Include(a => a.Puzzle)
            .FirstOrDefaultAsync(a => a.Id == attemptId, ct);
        if (attempt is null || attempt.UserId != userId || attempt.Puzzle is null)
            return null;
        if (attempt.TournamentId is not null || !attempt.Puzzle.IsDaily)
            return null;

        var existing = await db.AttemptRatings.FirstOrDefaultAsync(r => r.AttemptId == attemptId, ct);
        if (existing is not null)
            return existing.Delta;

        var rating = await db.UserRatings.FirstOrDefaultAsync(
            r => r.UserId == userId && r.GameType == attempt.Puzzle.GameType, ct);
        if (rating is null)
        {
            rating = new UserRating
            {
                UserId = userId,
                GameType = attempt.Puzzle.GameType,
                Value = Elo.Initial,
            };
            db.UserRatings.Add(rating);
        }

        var delta = Elo.Delta(rating.Value, Elo.PuzzleRating(attempt.Puzzle.Difficulty), won);
        rating.Value += delta;
        db.AttemptRatings.Add(new AttemptRating
        {
            AttemptId = attemptId,
            UserId = userId,
            Delta = delta,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        if (won)
            await GrantMissions(userId, attempt, ct);

        await db.SaveChangesAsync(ct);
        return delta;
    }

    private async Task GrantMissions(int userId, Attempt attempt, CancellationToken ct)
    {
        var finished = attempt.FinishedAt ?? DateTimeOffset.UtcNow;
        var date = DateOnly.FromDateTime(finished.UtcDateTime);
        var dailyReason = $"daily:{date:yyyy-MM-dd}";
        if (!await db.BoosterGrants.AnyAsync(g => g.UserId == userId && g.Reason == dailyReason, ct))
        {
            db.BoosterGrants.Add(new BoosterGrant
            {
                UserId = userId,
                Type = BoosterType.Hint,
                Amount = 1,
                Reason = dailyReason,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        }

        var isoYear = ISOWeek.GetYear(finished.UtcDateTime);
        var isoWeek = ISOWeek.GetWeekOfYear(finished.UtcDateTime);
        var weeklyReason = $"weekly:{isoYear}-W{isoWeek:00}";
        if (await db.BoosterGrants.AnyAsync(g => g.UserId == userId && g.Reason == weeklyReason, ct))
            return;

        var solved = await db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId
                && a.Status == AttemptStatus.Solved
                && a.TournamentId == null
                && a.FinishedAt != null)
            .Join(db.Puzzles.Where(p => p.IsDaily), a => a.PuzzleId, p => p.Id, (a, _) => a.FinishedAt!.Value)
            .ToListAsync(ct);
        var inWeek = solved.Count(t =>
            ISOWeek.GetYear(t.UtcDateTime) == isoYear && ISOWeek.GetWeekOfYear(t.UtcDateTime) == isoWeek);
        if (inWeek >= 5)
        {
            db.BoosterGrants.Add(new BoosterGrant
            {
                UserId = userId,
                Type = BoosterType.Shield,
                Amount = 1,
                Reason = weeklyReason,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        }
    }
}
