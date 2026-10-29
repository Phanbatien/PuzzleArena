using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;

namespace PuzzleArena.Api.Data;

/// <summary>
/// BE3: người chơi giả và kết quả daily 3 ngày gần nhất để bảng xếp hạng không trống khi demo.
/// Chỉ chạy khi bật "Seed:FakeLeaderboard" (launch profile của môi trường dev).
/// Các tài khoản này không có mật khẩu nên không ai đăng nhập được, và tách khỏi admin, player1..8.
/// </summary>
public static class DemoLeaderboardSeeder
{
    public const string EmailDomain = "@demo.puzzlearena.local";

    private static readonly string[] Names =
    [
        "minh_anh", "sudoku_king", "bao_tran", "mine_hunter", "thu_ha", "quang_huy",
        "puzzle_pro", "ngoc_lan", "duc_long", "khanh_vy", "gia_bao", "nine_by_nine",
    ];

    private static readonly Difficulty[] Difficulties = [Difficulty.Easy, Difficulty.Medium, Difficulty.Hard];

    // ponytail: chỉ chạy lúc khởi động, nên server để qua nửa đêm thì "top ngày" của ngày mới trống cho tới khi khởi động lại.
    public static async Task SeedAsync(AppDb db, IPuzzleGenerator generator, CancellationToken ct = default)
    {
        var bots = await db.Users.Where(u => u.Email.EndsWith(EmailDomain)).ToListAsync(ct);
        if (bots.Count == 0)
        {
            var rng = new Random(2026);
            bots = Names.Select(n => new User
            {
                Username = n,
                Email = n + EmailDomain,
                Role = Role.Player,
                CreatedAt = DateTimeOffset.UtcNow,
                Ratings = Enum.GetValues<GameType>()
                    .Select(g => new UserRating { GameType = g, Value = rng.Next(820, 1780) })
                    .ToList(),
            }).ToList();
            db.Users.AddRange(bots);
            await db.SaveChangesAsync(ct);
        }

        var botIds = bots.Select(b => b.Id).ToList();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        foreach (var game in Enum.GetValues<GameType>())
        {
            for (var back = 2; back >= 0; back--)
            {
                var day = today.AddDays(-back);
                var puzzles = await EnsureDaily(db, generator, game, day, ct);
                var puzzleIds = puzzles.Select(p => p.Id).ToList();
                if (await db.Attempts.AnyAsync(a => puzzleIds.Contains(a.PuzzleId) && botIds.Contains(a.UserId), ct))
                    continue;

                var rng = new Random(day.DayNumber * 31 + (int)game);
                foreach (var bot in bots)
                foreach (var puzzle in puzzles)
                {
                    var level = (int)puzzle.Difficulty + 1;
                    if (rng.NextDouble() > 1.0 - 0.22 * level) continue; // đề càng khó càng ít người giải xong
                    var started = new DateTimeOffset(day.ToDateTime(new TimeOnly(rng.Next(1, 14), rng.Next(60))), TimeSpan.Zero);
                    var duration = (long)(level * 150_000 * (0.5 + rng.NextDouble()));
                    db.Attempts.Add(new Attempt
                    {
                        UserId = bot.Id,
                        PuzzleId = puzzle.Id,
                        Status = AttemptStatus.Solved,
                        Progress = 100,
                        StartedAt = started,
                        FinishedAt = started.AddMilliseconds(duration),
                        DurationMs = duration,
                        Mistakes = game == GameType.Sudoku ? rng.Next(0, 3) : 0,
                        State = puzzle.Solution,
                    });
                }
                await db.SaveChangesAsync(ct);
            }
        }
    }

    // Cùng seed với GET /api/daily của BE1, nên đề hôm nay trùng với đề người chơi thật nhận được.
    private static async Task<List<Puzzle>> EnsureDaily(
        AppDb db, IPuzzleGenerator generator, GameType game, DateOnly day, CancellationToken ct)
    {
        var existing = await db.Puzzles.Where(p => p.IsDaily && p.DailyDate == day && p.GameType == game).ToListAsync(ct);
        foreach (var difficulty in Difficulties.Where(d => existing.All(p => p.Difficulty != d)))
        {
            var puzzle = generator.Generate(game, difficulty, DailySeed.For(day, game, difficulty));
            puzzle.IsDaily = true;
            puzzle.DailyDate = day;
            db.Puzzles.Add(puzzle);
            existing.Add(puzzle);
        }
        await db.SaveChangesAsync(ct);
        return existing;
    }
}
