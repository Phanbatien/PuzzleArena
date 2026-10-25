using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Games;
using PuzzleArena.Api.Services;

namespace PuzzleArena.Api.Data;

/// <summary>
/// Fake players and results so the leaderboards are not empty in a demo ("Seed:FakeLeaderboard").
/// These accounts have no password hash, so nobody can sign in as them, and they are separate from
/// the test accounts (admin, player1..N), whose own daily puzzles stay untouched.
/// </summary>
public static class DemoData
{
    public const string EmailDomain = "@demo.puzzlearena.local";

    static readonly string[] Names =
    [
        "minh_anh", "sudoku_king", "bao_tran", "mine_hunter", "thu_ha", "quang_huy",
        "puzzle_pro", "ngoc_lan", "duc_long", "khanh_vy", "gia_bao", "nine_by_nine",
    ];

    // ponytail: runs at startup only, so a server left running past midnight shows an empty "top day"
    // until it restarts. Move it behind a daily timer if a demo ever runs that long.
    public static async Task SeedLeaderboardAsync(AppDb db)
    {
        var bots = await db.Users.Where(u => u.Email.EndsWith(EmailDomain)).ToListAsync();
        if (bots.Count == 0)
        {
            bots = Names.Select(n => new User { Username = n, Email = n + EmailDomain, Role = Role.Player }).ToList();
            db.Users.AddRange(bots);
            var ratings = new Random(2026);
            foreach (var bot in bots)
                foreach (var game in Enum.GetValues<GameType>())
                    db.UserRatings.Add(new UserRating { User = bot, GameType = game, Value = ratings.Next(820, 1780) });
            await db.SaveChangesAsync();
        }

        var today = Missions.Today();
        var botIds = bots.Select(b => b.Id).ToList();
        foreach (var game in Enum.GetValues<GameType>())
            for (var back = 2; back >= 0; back--)
            {
                var day = today.AddDays(-back);
                var puzzles = await DailyPuzzles.EnsureAsync(db, game, day);
                var puzzleIds = puzzles.Select(p => p.Id).ToList();
                if (await db.Attempts.AnyAsync(a => puzzleIds.Contains(a.PuzzleId) && botIds.Contains(a.UserId))) continue;

                var rng = new Random(day.DayNumber * 31 + (int)game);
                foreach (var bot in bots)
                    foreach (var puzzle in puzzles)
                    {
                        var level = (int)puzzle.Difficulty + 1;
                        if (rng.NextDouble() > 1.0 - 0.22 * level) continue; // fewer bots finish the harder ones
                        var started = day.ToDateTime(new TimeOnly(rng.Next(1, 14), rng.Next(60)), DateTimeKind.Utc);
                        var duration = (int)(level * 150_000 * (0.5 + rng.NextDouble()));
                        var mistakes = game == GameType.Sudoku ? rng.Next(0, 3) : 0;
                        db.Attempts.Add(new Attempt
                        {
                            UserId = bot.Id, PuzzleId = puzzle.Id, Status = AttemptStatus.Solved, Progress = 100,
                            StartedAt = started, FinishedAt = started.AddMilliseconds(duration), DurationMs = duration,
                            Mistakes = mistakes, Score = Rating.Score(puzzle.Difficulty, duration, mistakes),
                            State = GameEngine.InitialState(puzzle),
                        });
                    }
                await db.SaveChangesAsync();
            }
    }
}
