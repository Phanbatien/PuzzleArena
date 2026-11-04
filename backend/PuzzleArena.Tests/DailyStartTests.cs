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

    private Task<AttemptResult> Start(int user, Difficulty difficulty = Difficulty.Easy, GameType game = GameType.Sudoku) =>
        _svc.StartDaily(user, game, difficulty, new GamePuzzleGenerator());

    private async Task Lose(Attempt attempt)
    {
        for (int i = 0; i < 3 && attempt.Status == AttemptStatus.InProgress; i++)
        {
            int cell = attempt.State.IndexOf('0');
            int wrong = attempt.Puzzle.Solution[cell] == '1' ? 2 : 1;
            await _svc.Move(attempt.UserId, attempt.Id, cell, wrong);
        }
    }

    [Fact]
    public async Task FirstCall_CreatesInProgressAttempt_OnANewDailyPuzzleForToday()
    {
        var result = await Start(_alice);

        Assert.Null(result.Error);
        var attempt = result.Attempt!;
        Assert.Equal(AttemptStatus.InProgress, attempt.Status);
        Assert.Equal(_alice, attempt.UserId);
        Assert.True(attempt.Puzzle.IsDaily);
        Assert.Equal(DateOnly.FromDateTime(DateTime.UtcNow), attempt.Puzzle.DailyDate);
        Assert.Equal(Difficulty.Easy, attempt.Puzzle.Difficulty);
        Assert.Null(attempt.TournamentId);
        Assert.Null(attempt.Deadline);
    }

    [Fact]
    public async Task WhilePlaying_StartReturnsTheSameAttempt_SoTheHardPuzzleCannotBeRerolled()
    {
        var first = await Start(_alice, Difficulty.Hard);
        var second = await Start(_alice, Difficulty.Hard);

        Assert.Equal(first.Attempt!.Id, second.Attempt!.Id);
        Assert.Equal(1, _db.Attempts.Count(a => a.UserId == _alice));
    }

    [Fact]
    public async Task AfterAGameEnds_TheNextStartIsANewAttemptOnADifferentPuzzle()
    {
        var first = (await Start(_alice)).Attempt!;
        await Lose(first);
        Assert.Equal(AttemptStatus.Failed, first.Status);

        var next = (await Start(_alice)).Attempt!;

        Assert.NotEqual(first.Id, next.Id);
        Assert.NotEqual(first.PuzzleId, next.PuzzleId);
        Assert.NotEqual(first.Puzzle.Seed, next.Puzzle.Seed);
        Assert.Equal(AttemptStatus.InProgress, next.Status);
    }

    [Fact]
    public async Task UnlimitedPlays_NeverRepeatAPuzzleForTheSamePlayer()
    {
        var seeds = new List<int>();
        for (int i = 0; i < 15; i++)
        {
            var attempt = (await Start(_alice)).Attempt!;
            seeds.Add(attempt.Puzzle.Seed);
            await _svc.Abandon(_alice, attempt.Id);
        }

        Assert.Equal(seeds.Count, seeds.Distinct().Count());
        Assert.Equal(15, _db.Puzzles.Count(p => p.IsDaily));
    }

    [Fact]
    public async Task EachUser_GetsTheirOwnRandomPuzzle()
    {
        var a = (await Start(_alice)).Attempt!;
        var b = (await Start(_bob)).Attempt!;

        Assert.NotEqual(a.Id, b.Id);
        Assert.NotEqual(a.PuzzleId, b.PuzzleId);
    }

    [Fact]
    public async Task EachGameAndDifficulty_HasItsOwnInProgressAttempt()
    {
        var easy = (await Start(_alice, Difficulty.Easy)).Attempt!;
        var hard = (await Start(_alice, Difficulty.Hard)).Attempt!;
        var mines = (await Start(_alice, Difficulty.Easy, GameType.Minesweeper)).Attempt!;

        Assert.Equal(3, new[] { easy.Id, hard.Id, mines.Id }.Distinct().Count());
        Assert.Equal(easy.Id, (await Start(_alice, Difficulty.Easy)).Attempt!.Id);
    }
}
