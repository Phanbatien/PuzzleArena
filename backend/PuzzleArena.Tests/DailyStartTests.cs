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

public sealed class DailyStartTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly AppDb _db;
    private readonly AttemptService _svc;
    private readonly int _alice;
    private readonly int _bob;

    public DailyStartTests()
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

    private async Task<Puzzle> AddPuzzle(bool daily, int daysAgo = 0, Difficulty difficulty = Difficulty.Easy)
    {
        var puzzle = GameEngine.Generate(GameType.Sudoku, difficulty, 1);
        puzzle.IsDaily = daily;
        if (daily) puzzle.DailyDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-daysAgo);
        _db.Puzzles.Add(puzzle);
        await _db.SaveChangesAsync();
        return puzzle;
    }

    [Fact]
    public async Task FirstCall_CreatesInProgressAttempt()
    {
        var puzzle = await AddPuzzle(daily: true);

        var result = await _svc.StartDaily(_alice, puzzle.Id);

        Assert.Null(result.Error);
        Assert.NotEqual(0, result.Attempt!.Id);
        Assert.Equal(AttemptStatus.InProgress, result.Attempt.Status);
        Assert.Equal(_alice, result.Attempt.UserId);
        Assert.Equal(puzzle.Id, result.Attempt.PuzzleId);
        Assert.Null(result.Attempt.TournamentId);
        Assert.Null(result.Attempt.Deadline);
    }

    [Fact]
    public async Task SecondCall_ReturnsSameAttempt_AndDoesNotCreateAnother()
    {
        var puzzle = await AddPuzzle(daily: true);

        var first = await _svc.StartDaily(_alice, puzzle.Id);
        var second = await _svc.StartDaily(_alice, puzzle.Id);

        Assert.Equal(first.Attempt!.Id, second.Attempt!.Id);
        Assert.Equal(1, _db.Attempts.Count(a => a.UserId == _alice && a.PuzzleId == puzzle.Id));
    }

    [Fact]
    public async Task FinishedAttempt_IsReturnedAsIs_NoSecondChance()
    {
        var puzzle = await AddPuzzle(daily: true);
        var started = (await _svc.StartDaily(_alice, puzzle.Id)).Attempt!;
        for (int i = 0; i < 3; i++)
        {
            int cell = started.State.IndexOf('0');
            int wrong = started.Puzzle.Solution[cell] == '1' ? 2 : 1;
            await _svc.Move(_alice, started.Id, cell, wrong);
        }
        Assert.Equal(AttemptStatus.Failed, started.Status);

        var again = await _svc.StartDaily(_alice, puzzle.Id);

        Assert.Equal(started.Id, again.Attempt!.Id);
        Assert.Equal(AttemptStatus.Failed, again.Attempt.Status);
        Assert.Equal(1, _db.Attempts.Count(a => a.UserId == _alice && a.PuzzleId == puzzle.Id));
    }

    [Fact]
    public async Task EachUser_GetsTheirOwnAttempt()
    {
        var puzzle = await AddPuzzle(daily: true);

        var a = await _svc.StartDaily(_alice, puzzle.Id);
        var b = await _svc.StartDaily(_bob, puzzle.Id);

        Assert.NotEqual(a.Attempt!.Id, b.Attempt!.Id);
        Assert.Equal(_alice, a.Attempt.UserId);
        Assert.Equal(_bob, b.Attempt.UserId);
    }

    [Fact]
    public async Task NonDailyPuzzle_IsRejected()
    {
        var practice = await AddPuzzle(daily: false);

        var result = await _svc.StartDaily(_alice, practice.Id);

        Assert.Equal(404, result.Status);
        Assert.NotNull(result.Error);
        Assert.Empty(_db.Attempts.ToList());
    }

    [Fact]
    public async Task UnknownPuzzle_Returns404()
    {
        var result = await _svc.StartDaily(_alice, 99999);
        Assert.Equal(404, result.Status);
    }

    [Fact]
    public async Task YesterdaysDaily_IsRejected()
    {
        var old = await AddPuzzle(daily: true, daysAgo: 1);

        var result = await _svc.StartDaily(_alice, old.Id);

        Assert.Equal(400, result.Status);
        Assert.NotNull(result.Error);
        Assert.Empty(_db.Attempts.ToList());
    }
}
