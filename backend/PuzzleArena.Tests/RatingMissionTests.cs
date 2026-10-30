using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Tests;

public class RatingMissionTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public RatingMissionTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task ApplyResult_moves_elo_once_and_history_shows_the_delta()
    {
        var client = _factory.CreateClient();
        TestAuth.Use(client, await TestAuth.DevTokenAsync(client, "player1"));
        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        var userId = me.GetProperty("id").GetInt32();

        var attemptId = await AddDailyAttempt(userId, GameType.Sudoku, Difficulty.Easy, DateTimeOffset.UtcNow, solved: true);
        using var scope = _factory.Services.CreateScope();
        var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();

        var expected = Elo.Delta(Elo.Initial, Elo.PuzzleRating(Difficulty.Easy), won: true);
        Assert.Equal(expected, await rating.ApplyResult(userId, attemptId, won: true));
        Assert.Equal(expected, await rating.ApplyResult(userId, attemptId, won: true));

        var value = await db.UserRatings.Where(r => r.UserId == userId && r.GameType == GameType.Sudoku)
            .Select(r => r.Value)
            .SingleAsync();
        Assert.Equal(Elo.Initial + expected, value);

        var history = await client.GetFromJsonAsync<JsonElement>("/api/me/history");
        Assert.Equal(attemptId, history[0].GetProperty("attemptId").GetInt32());
        Assert.Equal(expected, history[0].GetProperty("ratingChange").GetInt32());
    }

    [Fact]
    public async Task Tournament_attempt_does_not_change_elo()
    {
        var client = _factory.CreateClient();
        TestAuth.Use(client, await TestAuth.DevTokenAsync(client, "player2"));
        var userId = (await client.GetFromJsonAsync<JsonElement>("/api/me")).GetProperty("id").GetInt32();
        var attemptId = await AddDailyAttempt(userId, GameType.Sudoku, Difficulty.Hard, DateTimeOffset.UtcNow, solved: true, tournamentId: 9);

        using var scope = _factory.Services.CreateScope();
        var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();
        Assert.Null(await rating.ApplyResult(userId, attemptId, won: true));

        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        var value = await db.UserRatings.Where(r => r.UserId == userId && r.GameType == GameType.Sudoku)
            .Select(r => r.Value)
            .SingleAsync();
        Assert.Equal(Elo.Initial, value);
    }

    [Fact]
    public async Task Daily_reward_once_weekly_reward_on_fifth_and_admin_grant()
    {
        var client = _factory.CreateClient();
        TestAuth.Use(client, await TestAuth.DevTokenAsync(client, "player3"));
        var userId = (await client.GetFromJsonAsync<JsonElement>("/api/me")).GetProperty("id").GetInt32();
        var now = DateTimeOffset.UtcNow;

        var failed = await AddDailyAttempt(userId, GameType.Minesweeper, Difficulty.Hard, now, solved: false);
        using (var scope = _factory.Services.CreateScope())
        {
            var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();
            await rating.ApplyResult(userId, failed, won: false);
        }

        var beforeWins = await client.GetFromJsonAsync<JsonElement>("/api/boosters");
        Assert.Equal(0, Amount(beforeWins, "Hint"));

        var puzzles = new (GameType Game, Difficulty Difficulty)[]
        {
            (GameType.Sudoku, Difficulty.Easy),
            (GameType.Sudoku, Difficulty.Medium),
            (GameType.Sudoku, Difficulty.Hard),
            (GameType.Minesweeper, Difficulty.Easy),
            (GameType.Minesweeper, Difficulty.Medium),
        };

        for (var i = 0; i < 4; i++)
        {
            var attemptId = await AddDailyAttempt(userId, puzzles[i].Game, puzzles[i].Difficulty, now, solved: true);
            using var scope = _factory.Services.CreateScope();
            var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();
            await rating.ApplyResult(userId, attemptId, won: true);
        }

        var afterFour = await client.GetFromJsonAsync<JsonElement>("/api/boosters");
        Assert.Equal(1, Amount(afterFour, "Hint"));
        Assert.Equal(0, Amount(afterFour, "Shield"));

        var missions = await client.GetFromJsonAsync<JsonElement>("/api/me/missions");
        Assert.True(missions[0].GetProperty("rewardClaimed").GetBoolean());
        Assert.Equal(4, missions[1].GetProperty("progress").GetInt32());
        Assert.False(missions[1].GetProperty("completed").GetBoolean());

        var fifth = await AddDailyAttempt(userId, puzzles[4].Game, puzzles[4].Difficulty, now, solved: true);
        using (var scope = _factory.Services.CreateScope())
        {
            var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();
            await rating.ApplyResult(userId, fifth, won: true);
        }

        var afterFive = await client.GetFromJsonAsync<JsonElement>("/api/boosters");
        Assert.Equal(1, Amount(afterFive, "Hint"));
        Assert.Equal(1, Amount(afterFive, "Shield"));

        var admin = _factory.CreateClient();
        TestAuth.Use(admin, await TestAuth.DevTokenAsync(admin, "admin"));
        var grant = await admin.PostAsJsonAsync("/api/boosters/grant", new { userId, type = "Hint", amount = 2 });
        Assert.Equal(HttpStatusCode.OK, grant.StatusCode);
        var granted = await grant.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Hint", granted.GetProperty("type").GetString());
        Assert.Equal(3, granted.GetProperty("amount").GetInt32());
    }

    [Fact]
    public async Task Streak_counts_consecutive_days_and_resets_after_a_gap()
    {
        var client = _factory.CreateClient();
        TestAuth.Use(client, await TestAuth.DevTokenAsync(client, "player4"));
        var userId = (await client.GetFromJsonAsync<JsonElement>("/api/me")).GetProperty("id").GetInt32();
        var today = DateTimeOffset.UtcNow;

        await Solve(userId, GameType.Sudoku, Difficulty.Easy, today);
        await Solve(userId, GameType.Sudoku, Difficulty.Medium, today.AddDays(-1));
        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.Equal(2, me.GetProperty("streak").GetInt32());

        var other = _factory.CreateClient();
        TestAuth.Use(other, await TestAuth.DevTokenAsync(other, "player5"));
        var otherId = (await other.GetFromJsonAsync<JsonElement>("/api/me")).GetProperty("id").GetInt32();
        await Solve(otherId, GameType.Minesweeper, Difficulty.Hard, today.AddDays(-2));
        var stale = await other.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.Equal(0, stale.GetProperty("streak").GetInt32());
    }

    private async Task Solve(int userId, GameType game, Difficulty difficulty, DateTimeOffset finished)
    {
        var attemptId = await AddDailyAttempt(userId, game, difficulty, finished, solved: true);
        using var scope = _factory.Services.CreateScope();
        var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();
        await rating.ApplyResult(userId, attemptId, won: true);
    }

    private async Task<int> AddDailyAttempt(
        int userId,
        GameType game,
        Difficulty difficulty,
        DateTimeOffset finished,
        bool solved,
        int? tournamentId = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        var dailyDate = DateOnly.FromDateTime(finished.UtcDateTime);
        var puzzle = await db.Puzzles.FirstOrDefaultAsync(p =>
            p.IsDaily && p.GameType == game && p.Difficulty == difficulty && p.DailyDate == dailyDate);
        if (puzzle is null)
        {
            puzzle = new Puzzle
            {
                GameType = game,
                Difficulty = difficulty,
                Seed = Random.Shared.Next(),
                BoardConfig = "0",
                Solution = "secret-answer",
                IsDaily = true,
                DailyDate = dailyDate,
            };
            db.Puzzles.Add(puzzle);
            await db.SaveChangesAsync();
        }
        var attempt = new Attempt
        {
            UserId = userId,
            PuzzleId = puzzle.Id,
            TournamentId = tournamentId,
            StartedAt = finished.AddMinutes(-5),
            FinishedAt = finished,
            DurationMs = 300_000,
            Mistakes = 1,
            Status = solved ? AttemptStatus.Solved : AttemptStatus.InProgress,
            State = "",
            MoveLog = "",
        };
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();
        return attempt.Id;
    }

    private static int Amount(JsonElement balances, string type)
    {
        foreach (var item in balances.EnumerateArray())
        {
            if (item.GetProperty("type").GetString() == type)
                return item.GetProperty("amount").GetInt32();
        }

        throw new InvalidOperationException($"Missing booster {type}.");
    }
}
