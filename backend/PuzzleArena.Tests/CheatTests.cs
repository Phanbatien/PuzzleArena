using System.Text;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Boosters;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;
using PuzzleArena.Api.Rating;
using Xunit;

namespace PuzzleArena.Tests;

public class CheatDetectorTests
{
    private static Attempt SolvedSudoku(long durationMs, string moveLog)
    {
        var puzzle = GameEngine.Generate(GameType.Sudoku, Difficulty.Easy, 1);
        return new Attempt
        {
            Puzzle = puzzle,
            Status = AttemptStatus.Solved,
            DurationMs = durationMs,
            MoveLog = moveLog,
        };
    }

    private static string Log(int moves, long gapMs)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < moves; i++)
            sb.Append($"{(i + 1) * gapMs}|{i}|5|C\n");
        return sb.ToString();
    }

    [Fact]
    public void NormalHumanSolve_IsNotFlagged()
    {
        // 39 ô trống, 5 giây mỗi nước, tổng ~3 phút
        var a = SolvedSudoku(durationMs: 195_000, moveLog: Log(39, 5_000));
        Assert.Empty(CheatDetector.Analyze(a));
    }

    [Fact]
    public void VeryFastSudoku_IsFlagged()
    {
        var a = SolvedSudoku(durationMs: 4_000, moveLog: Log(39, 100));
        var reasons = CheatDetector.Analyze(a);
        Assert.Contains(reasons, r => r.StartsWith("Giải quá nhanh"));
        Assert.Contains(reasons, r => r.StartsWith("Nhịp đi giống bot"));
    }

    [Fact]
    public void BotLikeRhythm_IsFlagged_EvenIfTotalTimeLooksOk()
    {
        var a = SolvedSudoku(durationMs: 120_000, moveLog: Log(39, 100));
        var reasons = CheatDetector.Analyze(a);
        Assert.Single(reasons);
        Assert.StartsWith("Nhịp đi giống bot", reasons[0]);
    }

    [Fact]
    public void FastMinesweeper_IsFlagged()
    {
        var puzzle = GameEngine.Generate(GameType.Minesweeper, Difficulty.Hard, 1);
        var a = new Attempt { Puzzle = puzzle, Status = AttemptStatus.Solved, DurationMs = 2_000, MoveLog = "" };
        Assert.Single(CheatDetector.Analyze(a));

        a.DurationMs = 60_000;
        Assert.Empty(CheatDetector.Analyze(a));
    }

    [Fact]
    public void ParseLog_SkipsBrokenLines_AndCountMovesIgnoresVoidMarker()
    {
        string log = "100|3|5|C\nrác\n200|4|6|W\n0|-1|0|V\n";
        Assert.Equal(3, CheatDetector.ParseLog(log).Count);
        Assert.Equal(2, CheatDetector.CountMoves(log));
    }
}

public sealed class VoidAndSuspiciousTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly AppDb _db;
    private readonly AttemptService _svc;
    private readonly int _alice;

    public VoidAndSuspiciousTests()
    {
        _conn.Open();
        _db = new AppDb(new DbContextOptionsBuilder<AppDb>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();

        var alice = new User
        {
            Username = "alice",
            Email = "alice@test.local",
            PasswordHash = "x",
            Role = Role.Player,
        };
        _db.Users.Add(alice);
        _db.SaveChanges();
        _alice = alice.Id;

        _svc = new AttemptService(_db, new BoosterService(_db), new RatingService(_db));
    }

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }

    // Giải hết ô liền một mạch: gần như tức thì nên chắc chắn bị đánh dấu nghi vấn.
    private async Task<Attempt> SolveInstantly(bool daily)
    {
        var puzzle = GameEngine.Generate(GameType.Sudoku, Difficulty.Easy, 1);
        puzzle.IsDaily = daily;
        if (daily) puzzle.DailyDate = DateOnly.FromDateTime(DateTime.UtcNow);

        var a = await _svc.Start(_alice, puzzle);
        for (int i = 0; i < 81; i++)
        {
            if (a.State[i] != '0') continue;
            var r = await _svc.Move(_alice, a.Id, i, a.Puzzle.Solution[i] - '0');
            Assert.Null(r.Error);
        }
        Assert.Equal(AttemptStatus.Solved, a.Status);
        return a;
    }

    [Fact]
    public async Task InstantSolve_AppearsInSuspiciousList_WithReasons()
    {
        var a = await SolveInstantly(daily: false);

        var list = await _svc.ListSuspicious(game: null, limit: 10);

        var item = Assert.Single(list);
        Assert.Equal(a.Id, item.AttemptId);
        Assert.Equal("alice", item.Username);
        Assert.NotEmpty(item.Reasons);
        Assert.Empty(await _svc.ListSuspicious(GameType.Minesweeper, 10));
        Assert.Single(await _svc.ListSuspicious(GameType.Sudoku, 10));
    }

    [Fact]
    public async Task InProgressAttempt_IsNeverListed()
    {
        var puzzle = GameEngine.Generate(GameType.Sudoku, Difficulty.Easy, 1);
        await _svc.Start(_alice, puzzle);
        Assert.Empty(await _svc.ListSuspicious(null, 10));
    }

    [Fact]
    public async Task Void_TurnsSolvedIntoFailed_RestoresElo_AndDisappearsFromList()
    {
        var a = await SolveInstantly(daily: true);
        var ratingAfterWin = _db.UserRatings.Single(r => r.UserId == _alice).Value;
        Assert.True(ratingAfterWin > Elo.Initial); // thắng đề daily thì được cộng điểm
        Assert.Single(_db.AttemptRatings.Where(r => r.AttemptId == a.Id).ToList());

        var result = await _svc.Void(a.Id);

        Assert.Null(result.Error);
        Assert.Equal(AttemptStatus.Failed, result.Attempt!.Status);
        Assert.Contains("|V\n", result.Attempt.MoveLog);
        Assert.Equal(Elo.Initial, _db.UserRatings.Single(r => r.UserId == _alice).Value);
        Assert.Empty(_db.AttemptRatings.Where(r => r.AttemptId == a.Id).ToList());
        Assert.Empty(await _svc.ListSuspicious(null, 10));
    }

    [Fact]
    public async Task Void_IsIdempotent_DoesNotRefundTwice()
    {
        var a = await SolveInstantly(daily: true);

        await _svc.Void(a.Id);
        var second = await _svc.Void(a.Id);

        Assert.Null(second.Error);
        Assert.Equal(Elo.Initial, _db.UserRatings.Single(r => r.UserId == _alice).Value);
    }

    [Fact]
    public async Task Void_RejectsInProgressAndUnknownAttempts()
    {
        var puzzle = GameEngine.Generate(GameType.Sudoku, Difficulty.Easy, 1);
        var a = await _svc.Start(_alice, puzzle);

        var inProgress = await _svc.Void(a.Id);
        Assert.Equal(400, inProgress.Status);
        Assert.Equal(AttemptStatus.InProgress, a.Status);

        var missing = await _svc.Void(99999);
        Assert.Equal(404, missing.Status);
    }
}
