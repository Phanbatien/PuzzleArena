using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PuzzleArena.DataAccess;
using PuzzleArena.DataAccess.Domain;
using PuzzleArena.Business.Rating;

namespace PuzzleArena.Tests;

public class DailyTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public DailyTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Daily_lists_three_difficulties_and_every_play_is_a_new_unlimited_puzzle()
    {
        var client = _factory.CreateClient();
        TestAuth.Use(client, await TestAuth.DevTokenAsync(client, "player1"));

        var cards = await client.GetFromJsonAsync<JsonElement>("/api/daily?game=Sudoku");
        Assert.Equal(["Easy", "Medium", "Hard"], cards.EnumerateArray().Select(c => c.GetProperty("difficulty").GetString()));
        Assert.Equal(
            Elo.Delta(Elo.Initial, Elo.PuzzleRating(Difficulty.Easy), won: true),
            cards[0].GetProperty("ratingIfSolved").GetInt32());
        Assert.Equal("NotStarted", cards[0].GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, cards[0].GetProperty("attemptId").ValueKind);
        Assert.Equal(0, cards[0].GetProperty("playedToday").GetInt32());

        var first = await Start(client);
        var resumed = await Start(client);
        Assert.Equal(first.GetProperty("id").GetInt32(), resumed.GetProperty("id").GetInt32());

        cards = await client.GetFromJsonAsync<JsonElement>("/api/daily?game=Sudoku");
        Assert.Equal("InProgress", cards[0].GetProperty("status").GetString());
        Assert.Equal(first.GetProperty("id").GetInt32(), cards[0].GetProperty("attemptId").GetInt32());

        // Bỏ cuộc (tính là thua) rồi chơi tiếp: lượt mới, đề mới.
        await client.PostAsync($"/api/attempts/{first.GetProperty("id").GetInt32()}/abandon", null);
        var second = await Start(client);
        Assert.NotEqual(first.GetProperty("id").GetInt32(), second.GetProperty("id").GetInt32());
        Assert.NotEqual(first.GetProperty("puzzleId").GetInt32(), second.GetProperty("puzzleId").GetInt32());

        cards = await client.GetFromJsonAsync<JsonElement>("/api/daily?game=Sudoku");
        Assert.Equal(2, cards[0].GetProperty("playedToday").GetInt32());
        Assert.Equal(0, cards[0].GetProperty("solvedToday").GetInt32());
        Assert.False(cards[0].TryGetProperty("solution", out _));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        var mine = await db.Puzzles.Where(p => p.IsDaily).ToListAsync();
        Assert.Equal(2, mine.Count);
        Assert.All(mine, p => Assert.DoesNotContain(p.Solution, first.GetRawText() + second.GetRawText()));
    }

    private static async Task<JsonElement> Start(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/daily/start", new { game = "Sudoku", difficulty = "Easy" });
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
