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

// Test trực tiếp AttemptService trên SQLite trong bộ nhớ (không cần ApiFactory / đăng nhập).
public sealed class AttemptServiceTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly AppDb _db;
    private readonly AttemptService _svc;
    private readonly int _alice;
    private readonly int _bob;

    public AttemptServiceTests()
    {
        _conn.Open();
        _db = new AppDb(new DbContextOptionsBuilder<AppDb>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();

        var alice = NewUser("alice");
        var bob = NewUser("bob");
        _db.Users.AddRange(alice, bob);
        _db.SaveChanges();
        _alice = alice.Id;
        _bob = bob.Id;

        _svc = new AttemptService(_db, new BoosterService(_db), new RatingService(_db));
    }

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }

    private static User NewUser(string name) => new()
    {
        Username = name,
        Email = $"{name}@test.local",
        PasswordHash = "x",
        Role = Role.Player,
    };

    private Task<Attempt> StartSudoku(
        int userId, int seed = 1, int? tournamentId = null, DateTimeOffset? deadline = null, bool daily = false)
    {
        var puzzle = GameEngine.Generate(GameType.Sudoku, Difficulty.Easy, seed);
        puzzle.IsDaily = daily;
        if (daily) puzzle.DailyDate = DateOnly.FromDateTime(DateTime.UtcNow);
        return _svc.Start(userId, puzzle, tournamentId, deadline);
    }

    private Task<AttemptResult> WrongMove(Attempt a)
    {
        int cell = a.State.IndexOf('0');
        int wrong = a.Puzzle.Solution[cell] == '1' ? 2 : 1;
        return _svc.Move(a.UserId, a.Id, cell, wrong);
    }

    private async Task GiveShield(int userId)
    {
        _db.BoosterGrants.Add(new BoosterGrant
        {
            UserId = userId,
            Type = BoosterType.Shield,
            Amount = 1,
            Reason = "test",
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await _db.SaveChangesAsync();
    }

    [Fact]
    public async Task Sudoku_ThirdMistake_LosesTheAttempt()
    {
        var a = await StartSudoku(_alice);

        var r1 = await WrongMove(a);
        Assert.Equal(1, r1.Attempt!.Mistakes);
        Assert.Equal(AttemptStatus.InProgress, r1.Attempt.Status);
        Assert.False(r1.Correct);

        var r2 = await WrongMove(a);
        Assert.Equal(2, r2.Attempt!.Mistakes);
        Assert.Equal(AttemptStatus.InProgress, r2.Attempt.Status);

        var r3 = await WrongMove(a);
        Assert.Equal(3, r3.Attempt!.Mistakes);
        Assert.Equal(AttemptStatus.Failed, r3.Attempt.Status);
        Assert.NotNull(r3.Attempt.FinishedAt);
        Assert.NotNull(r3.Attempt.DurationMs);
    }

    [Fact]
    public async Task AnotherUser_CannotPlayMyAttempt()
    {
        var a = await StartSudoku(_alice);
        string before = a.State;
        int cell = a.State.IndexOf('0');

        var result = await _svc.Move(_bob, a.Id, cell, a.Puzzle.Solution[cell] - '0');

        Assert.NotNull(result.Error);
        Assert.Equal(403, result.Status);
        Assert.Equal(before, a.State);
        Assert.Equal(0, a.Mistakes);
        Assert.Equal("", a.MoveLog);
    }

    [Fact]
    public async Task AnotherUser_CannotViewOrAbandonMyAttempt()
    {
        var a = await StartSudoku(_alice);

        Assert.Equal(403, (await _svc.Get(_bob, isAdmin: false, a.Id)).Status);
        Assert.Equal(200, (await _svc.Get(_bob, isAdmin: true, a.Id)).Status);
        Assert.Equal(403, (await _svc.Abandon(_bob, a.Id)).Status);
        Assert.Equal(AttemptStatus.InProgress, a.Status);
    }

    [Fact]
    public async Task FinishedAttempt_RejectsFurtherMoves()
    {
        var a = await StartSudoku(_alice);
        await WrongMove(a);
        await WrongMove(a);
        await WrongMove(a);
        Assert.Equal(AttemptStatus.Failed, a.Status);

        int cell = a.State.IndexOf('0');
        var result = await _svc.Move(_alice, a.Id, cell, a.Puzzle.Solution[cell] - '0');

        Assert.NotNull(result.Error);
        Assert.Equal(400, result.Status);
        Assert.Equal('0', a.State[cell]);
    }

    [Fact]
    public async Task SolvingEveryCell_SolvesAttempt()
    {
        var a = await StartSudoku(_alice);

        AttemptResult? last = null;
        for (int i = 0; i < 81; i++)
        {
            if (a.State[i] != '0') continue;
            last = await _svc.Move(_alice, a.Id, i, a.Puzzle.Solution[i] - '0');
            Assert.Null(last.Error);
            Assert.True(last.Correct);
        }

        Assert.Equal(AttemptStatus.Solved, a.Status);
        Assert.Equal(100, a.Progress);
        Assert.NotNull(a.DurationMs);
        Assert.Equal(0, a.Mistakes);
    }

    [Fact]
    public async Task MoveLog_RecordsEveryMove()
    {
        var a = await StartSudoku(_alice);
        await WrongMove(a);
        int cell = a.State.IndexOf('0');
        await _svc.Move(_alice, a.Id, cell, a.Puzzle.Solution[cell] - '0');

        var lines = a.MoveLog.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(2, lines.Length);
        Assert.EndsWith("|W", lines[0]);
        Assert.EndsWith("|C", lines[1]);
        Assert.All(lines, l => Assert.Equal(4, l.Split('|').Length));
    }

    [Fact]
    public async Task Minesweeper_OpeningAMine_LosesImmediately()
    {
        var puzzle = GameEngine.Generate(GameType.Minesweeper, Difficulty.Easy, 1);
        var a = await _svc.Start(_alice, puzzle);

        var result = await _svc.Move(_alice, a.Id, puzzle.Solution.IndexOf('M'), 0);

        Assert.False(result.Correct);
        Assert.Equal(AttemptStatus.Failed, result.Attempt!.Status);
        Assert.Equal(1, result.Attempt.Mistakes);
    }

    [Fact]
    public async Task Minesweeper_SafeMove_KeepsPlaying_AndHidesMines()
    {
        var puzzle = GameEngine.Generate(GameType.Minesweeper, Difficulty.Easy, 1);
        var a = await _svc.Start(_alice, puzzle);
        int safe = a.State.IndexOf('#', 0);
        while (puzzle.Solution[safe] == 'M') safe = a.State.IndexOf('#', safe + 1);

        var result = await _svc.Move(_alice, a.Id, safe, 0);
        var dto = await _svc.ToResponse(result.Attempt!);

        Assert.True(result.Correct);
        Assert.Equal(AttemptStatus.InProgress, result.Attempt!.Status);
        Assert.DoesNotContain('*', dto.Board.Cells);
    }

    [Fact]
    public async Task Shield_AbsorbsFirstMistake_Only_OutsideTournament()
    {
        await GiveShield(_alice);
        var a = await StartSudoku(_alice);

        var first = await WrongMove(a);
        Assert.True(first.Shielded);
        Assert.Equal(0, first.Attempt!.Mistakes);

        var second = await WrongMove(a);
        Assert.False(second.Shielded);
        Assert.Equal(1, second.Attempt!.Mistakes);

        Assert.Equal(0, await new BoosterService(_db).Balance(_alice, BoosterType.Shield));
    }

    [Fact]
    public async Task Shield_IsNeverUsed_InTournament()
    {
        await GiveShield(_alice);
        var a = await StartSudoku(_alice, tournamentId: 5);

        var result = await WrongMove(a);

        Assert.False(result.Shielded);
        Assert.Equal(1, result.Attempt!.Mistakes);
        Assert.Equal(1, await new BoosterService(_db).Balance(_alice, BoosterType.Shield));
    }

    [Fact]
    public async Task PastDeadline_AttemptFails_AndMoveIsRejected()
    {
        var a = await StartSudoku(_alice, deadline: DateTimeOffset.UtcNow.AddMinutes(-1));
        int cell = a.State.IndexOf('0');

        var result = await _svc.Move(_alice, a.Id, cell, a.Puzzle.Solution[cell] - '0');

        Assert.NotNull(result.Error);
        Assert.Equal(AttemptStatus.Failed, a.Status);
        Assert.Equal('0', a.State[cell]);
    }

    [Fact]
    public async Task Abandon_FailsTheAttempt_AndIsIdempotent()
    {
        var a = await StartSudoku(_alice);

        var first = await _svc.Abandon(_alice, a.Id);
        Assert.Equal(AttemptStatus.Failed, first.Attempt!.Status);
        var finishedAt = first.Attempt.FinishedAt;

        var again = await _svc.Abandon(_alice, a.Id);
        Assert.Null(again.Error);
        Assert.Equal(finishedAt, again.Attempt!.FinishedAt);
    }

    [Fact]
    public async Task LosingDailyPuzzle_LowersRating_Once()
    {
        var a = await StartSudoku(_alice, daily: true);
        await WrongMove(a);
        await WrongMove(a);
        await WrongMove(a);

        var ratingRow = Assert.Single(_db.AttemptRatings.Where(r => r.AttemptId == a.Id).ToList());
        Assert.True(ratingRow.Delta < 0);

        var dto = await _svc.ToResponse(a);
        Assert.Equal(ratingRow.Delta, dto.RatingDelta);
    }

    [Fact]
    public async Task Response_NeverExposesSolution_WhileInProgress()
    {
        var a = await StartSudoku(_alice);
        var dto = await _svc.ToResponse(a);

        Assert.NotEqual(a.Puzzle.Solution, dto.Board.Cells);
        Assert.Contains('0', dto.Board.Cells);
        Assert.Equal(3, dto.MaxMistakes);
    }
}
