using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Games;

namespace PuzzleArena.Tests;

public sealed class DemoLeaderboardSeederTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly AppDb _db;

    public DemoLeaderboardSeederTests()
    {
        _conn.Open();
        _db = new AppDb(new DbContextOptionsBuilder<AppDb>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();
    }

    [Fact]
    public async Task Seeding_twice_adds_bots_and_results_once_and_bots_cannot_sign_in()
    {
        await DemoLeaderboardSeeder.SeedAsync(_db, new GamePuzzleGenerator());
        var users = await _db.Users.CountAsync();
        var attempts = await _db.Attempts.CountAsync();
        await DemoLeaderboardSeeder.SeedAsync(_db, new GamePuzzleGenerator());

        Assert.Equal(12, users);
        Assert.Equal(users, await _db.Users.CountAsync());
        Assert.Equal(attempts, await _db.Attempts.CountAsync());
        Assert.True(attempts > 0);
        Assert.All(await _db.Users.ToListAsync(), u => Assert.Equal("", u.PasswordHash));
        Assert.Equal(18, await _db.Puzzles.CountAsync(p => p.IsDaily)); // 2 game × 3 độ khó × 3 ngày
        Assert.True(await _db.Attempts.AllAsync(a => a.Status == AttemptStatus.Solved && a.TournamentId == null));
    }

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }
}
