using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using PuzzleArena.Api.Boosters;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Tests;

public class AdminHintTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AdminHintTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Player_cannot_list_users_and_lock_blocks_the_next_login()
    {
        var player = _factory.CreateClient();
        TestAuth.Use(player, await TestAuth.DevTokenAsync(player, "player6"));
        var forbidden = await player.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        var forbiddenBody = await forbidden.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Bạn không có quyền thực hiện thao tác này.", forbiddenBody.GetProperty("error").GetString());

        var admin = _factory.CreateClient();
        TestAuth.Use(admin, await TestAuth.DevTokenAsync(admin, "admin"));
        var users = await admin.GetFromJsonAsync<JsonElement>("/api/admin/users");
        var player6 = users.EnumerateArray().Single(u => u.GetProperty("username").GetString() == "player6");
        var id = player6.GetProperty("id").GetInt32();
        Assert.False(player6.GetProperty("isLocked").GetBoolean());
        Assert.True(player6.TryGetProperty("createdAt", out _));

        var locked = await admin.PatchAsJsonAsync($"/api/admin/users/{id}/status", new { isLocked = true });
        Assert.Equal(HttpStatusCode.OK, locked.StatusCode);
        var lockedBody = await locked.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(lockedBody.GetProperty("isLocked").GetBoolean());

        var role = await admin.PatchAsJsonAsync($"/api/admin/users/{id}/role", new { role = "Admin" });
        Assert.Equal(HttpStatusCode.OK, role.StatusCode);
        var roleBody = await role.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Admin", roleBody.GetProperty("role").GetString());

        var anonymous = _factory.CreateClient();
        var login = await anonymous.PostAsJsonAsync("/api/auth/login", new
        {
            username = "player6",
            password = PuzzleArena.Api.Data.DevSeeder.Password,
        });
        Assert.Equal(HttpStatusCode.Forbidden, login.StatusCode);
    }

    [Fact]
    public async Task Hint_rejects_tournament_finished_and_empty_balance_then_returns_501_without_spending()
    {
        var client = _factory.CreateClient();
        TestAuth.Use(client, await TestAuth.DevTokenAsync(client, "player7"));
        var userId = (await client.GetFromJsonAsync<JsonElement>("/api/me")).GetProperty("id").GetInt32();

        var empty = await AddAttempt(userId, tournamentId: null, AttemptStatus.InProgress);
        var noHint = await client.PostAsync($"/api/attempts/{empty}/hint", null);
        Assert.Equal(HttpStatusCode.BadRequest, noHint.StatusCode);

        var admin = _factory.CreateClient();
        TestAuth.Use(admin, await TestAuth.DevTokenAsync(admin, "admin"));
        var grant = await admin.PostAsJsonAsync("/api/boosters/grant", new { userId, type = "Hint", amount = 1 });
        Assert.Equal(HttpStatusCode.OK, grant.StatusCode);

        var tournament = await AddAttempt(userId, tournamentId: 3, AttemptStatus.InProgress);
        var blocked = await client.PostAsync($"/api/attempts/{tournament}/hint", null);
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);

        var finished = await AddAttempt(userId, tournamentId: null, AttemptStatus.Solved);
        var ended = await client.PostAsync($"/api/attempts/{finished}/hint", null);
        Assert.Equal(HttpStatusCode.BadRequest, ended.StatusCode);

        var pending = await client.PostAsync($"/api/attempts/{empty}/hint", null);
        Assert.Equal(HttpStatusCode.NotImplemented, pending.StatusCode);
        var body = await pending.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Gợi ý chưa nối với bàn chơi.", body.GetProperty("error").GetString());

        var balances = await client.GetFromJsonAsync<JsonElement>("/api/boosters");
        Assert.Equal(1, balances.EnumerateArray().Single(b => b.GetProperty("type").GetString() == "Hint").GetProperty("amount").GetInt32());

        using var scope = _factory.Services.CreateScope();
        var boosters = scope.ServiceProvider.GetRequiredService<IBoosterService>();
        Assert.False(await boosters.TryConsume(userId, BoosterType.Hint, tournament));
        Assert.True(await boosters.TryConsume(userId, BoosterType.Hint, empty));
        Assert.True(await boosters.TryConsume(userId, BoosterType.Hint, empty));
        Assert.Equal(0, await boosters.Balance(userId, BoosterType.Hint));
    }

    private async Task<int> AddAttempt(int userId, int? tournamentId, AttemptStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        var puzzle = new Puzzle
        {
            GameType = GameType.Sudoku,
            Difficulty = Difficulty.Easy,
            Seed = Random.Shared.Next(),
            BoardConfig = "0",
            Solution = "secret-answer",
            IsDaily = false,
        };
        db.Puzzles.Add(puzzle);
        await db.SaveChangesAsync();
        var attempt = new Attempt
        {
            UserId = userId,
            PuzzleId = puzzle.Id,
            TournamentId = tournamentId,
            StartedAt = DateTimeOffset.UtcNow,
            Status = status,
            State = "",
            MoveLog = "",
        };
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();
        return attempt.Id;
    }
}
