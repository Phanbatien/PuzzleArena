using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Api.Data;

/// <summary>
/// BE3: người chơi giả và kết quả daily 3 ngày gần nhất (đề ngẫu nhiên riêng, có Elo) để bảng xếp hạng không trống khi demo.
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

    // ponytail: chỉ chạy một lần (lúc khởi động, khi bot chưa có lượt nào), nên "top ngày" của các ngày sau chỉ có người thật.
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
        if (await db.Attempts.AnyAsync(a => botIds.Contains(a.UserId), ct))
            return;

        // Daily không giới hạn: mỗi bot chơi vài đề ngẫu nhiên riêng mỗi ngày, có thắng có thua.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var ratings = await db.UserRatings.Where(r => botIds.Contains(r.UserId)).ToListAsync(ct);
        foreach (var game in Enum.GetValues<GameType>())
        {
            for (var back = 2; back >= 0; back--)
            {
                var day = today.AddDays(-back);
                var rng = new Random(day.DayNumber * 31 + (int)game);
                foreach (var bot in bots)
                {
                    var rating = ratings.First(r => r.UserId == bot.Id && r.GameType == game);
                    for (var n = rng.Next(0, 5); n > 0; n--)
                    {
                        var difficulty = Difficulties[rng.Next(Difficulties.Length)];
                        var level = (int)difficulty + 1;
                        var solved = rng.NextDouble() < 1.0 - 0.2 * level; // đề càng khó càng dễ hỏng
                        var puzzle = generator.Generate(game, difficulty, rng.Next());
                        puzzle.IsDaily = true;
                        puzzle.DailyDate = day;
                        var started = new DateTimeOffset(day.ToDateTime(new TimeOnly(rng.Next(1, 14), rng.Next(60))), TimeSpan.Zero);
                        var duration = (long)(level * 150_000 * (0.5 + rng.NextDouble()));
                        var attempt = new Attempt
                        {
                            UserId = bot.Id,
                            Puzzle = puzzle,
                            Status = solved ? AttemptStatus.Solved : AttemptStatus.Failed,
                            Progress = solved ? 100 : rng.Next(20, 90),
                            StartedAt = started,
                            FinishedAt = started.AddMilliseconds(duration),
                            DurationMs = duration,
                            Mistakes = game == GameType.Sudoku ? rng.Next(0, solved ? 3 : 4) : solved ? 0 : 1,
                            State = solved ? puzzle.Solution : GameEngine.InitialState(puzzle),
                        };
                        var delta = Elo.Delta(rating.Value, Elo.PuzzleRating(difficulty), solved);
                        rating.Value += delta;
                        db.Attempts.Add(attempt);
                        db.AttemptRatings.Add(new AttemptRating
                        {
                            Attempt = attempt,
                            UserId = bot.Id,
                            Delta = delta,
                            CreatedAt = attempt.FinishedAt.Value,
                        });
                    }
                }
                await db.SaveChangesAsync(ct);
            }
        }
    }
}
