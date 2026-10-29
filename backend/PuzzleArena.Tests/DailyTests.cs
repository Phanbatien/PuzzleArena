using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Tests;

public class DailyTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public DailyTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Same_day_returns_the_same_three_puzzles_and_hides_the_solution()
    {
        var client = _factory.CreateClient();
        TestAuth.Use(client, await TestAuth.DevTokenAsync(client, "player1"));

        var first = await client.GetFromJsonAsync<JsonElement>("/api/daily?game=Sudoku");
        var second = await client.GetFromJsonAsync<JsonElement>("/api/daily?game=Sudoku");
        var mines = await client.GetFromJsonAsync<JsonElement>("/api/daily?game=Minesweeper");

        Assert.Equal(3, first.GetArrayLength());
        Assert.Equal(first.ToString(), second.ToString());
        Assert.Equal(3, mines.GetArrayLength());
        Assert.NotEqual(first[0].GetProperty("id").GetInt32(), mines[0].GetProperty("id").GetInt32());
        Assert.Equal("Easy", first[0].GetProperty("difficulty").GetString());
        Assert.Equal(
            Elo.Delta(Elo.Initial, Elo.PuzzleRating(Difficulty.Easy), won: true),
            first[0].GetProperty("ratingIfSolved").GetInt32());
        Assert.Equal("NotStarted", first[0].GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, first[0].GetProperty("attemptId").ValueKind);
        Assert.False(first[0].TryGetProperty("solution", out _));
        Assert.DoesNotContain("stub|", first.ToString(), StringComparison.Ordinal);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        var stored = await db.Puzzles.CountAsync(p => p.IsDaily && p.Solution.StartsWith("stub|"));
        Assert.Equal(6, stored);
    }
}
