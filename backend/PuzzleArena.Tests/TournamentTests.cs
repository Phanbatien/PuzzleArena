using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Tournaments;

namespace PuzzleArena.Tests;

public class TournamentTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public TournamentTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public void Rank_puts_solved_first_by_time_then_mistakes_then_progress_and_not_started_last()
    {
        TournamentEntry Entry(int id) => new()
        {
            UserId = id,
            User = new User { Username = $"u{id}" },
            RegisteredAt = DateTimeOffset.UnixEpoch.AddSeconds(id),
        };
        Attempt Done(int user, long ms, int mistakes) => new()
        {
            Id = user, UserId = user, Status = AttemptStatus.Solved, DurationMs = ms, Mistakes = mistakes, Progress = 100,
        };
        Attempt Playing(int user, int progress) => new()
        {
            Id = user, UserId = user, Status = AttemptStatus.InProgress, Progress = progress,
        };

        var ranked = TournamentService.Rank(
            Enumerable.Range(1, 6).Select(Entry),
            [Playing(1, 40), Done(2, 90_000, 2), Done(3, 90_000, 0), Done(4, 60_000, 1), Playing(5, 80)]);

        Assert.Equal([4, 3, 2, 5, 1, 6], ranked.Select(s => s.UserId));
        Assert.Equal([1, 2, 3, 4, 5, 6], ranked.Select(s => s.Rank));
        Assert.Equal("NotStarted", ranked[^1].Status);
    }

    [Fact]
    public async Task Two_round_tournament_only_lets_registered_players_in_and_only_top_n_into_the_final()
    {
        var admin = await Client("admin");
        var created = await admin.PostAsJsonAsync("/api/tournaments", new
        {
            name = "Giải thử",
            gameType = "Sudoku",
            difficulty = "Easy",
            finalistCount = 2,
            roundMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();

        var p1 = await Client("player1");
        var p2 = await Client("player2");
        var p3 = await Client("player3");
        var outsider = await Client("player4");
        foreach (var c in new[] { p1, p2, p3 })
            Assert.Equal(HttpStatusCode.OK, (await c.PostAsync($"/api/tournaments/{id}/register", null)).StatusCode);

        // Chưa bắt đầu thì chưa có đề.
        Assert.Equal(HttpStatusCode.BadRequest, (await p1.PostAsync($"/api/tournaments/{id}/play", null)).StatusCode);
        Assert.Equal("Qualifier", await Advance(admin, id));
        Assert.Equal(HttpStatusCode.BadRequest, (await outsider.PostAsync($"/api/tournaments/{id}/register", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await outsider.PostAsync($"/api/tournaments/{id}/play", null)).StatusCode);

        // player1 giải xong, player2 điền được 1 ô, player3 không vào thi.
        var a1 = await Play(p1, id);
        var a2 = await Play(p2, id);
        Assert.Equal(a2.GetProperty("id").GetInt32(), (await Play(p2, id)).GetProperty("id").GetInt32()); // vào lại = lượt cũ
        var solution = await Solution(a1.GetProperty("puzzleId").GetInt32());
        Assert.DoesNotContain(solution, a1.GetRawText()); // đáp án không bao giờ xuống client
        await SolveSudoku(p1, a1, solution);
        await FillOne(p2, a2, solution);

        var live = await admin.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}");
        var standings = live.GetProperty("standings").EnumerateArray().ToList();
        Assert.Equal(["player1", "player2", "player3"], standings.Select(s => s.GetProperty("username").GetString()));
        Assert.Equal("Solved", standings[0].GetProperty("status").GetString());
        Assert.False(live.TryGetProperty("board", out _));

        Assert.Equal("QualifierDone", await Advance(admin, id));
        var afterQualifier = await p2.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}");
        Assert.True(afterQualifier.GetProperty("isFinalist").GetBoolean());
        var finalists = afterQualifier.GetProperty("qualifier").EnumerateArray()
            .Where(s => s.GetProperty("isFinalist").GetBoolean())
            .Select(s => s.GetProperty("username").GetString());
        Assert.Equal(["player1", "player2"], finalists);

        // player2 bị kết thúc lượt khi vòng loại đóng.
        var a2After = await p2.GetFromJsonAsync<JsonElement>($"/api/attempts/{a2.GetProperty("id").GetInt32()}");
        Assert.Equal("Failed", a2After.GetProperty("status").GetString());

        Assert.Equal("Final", await Advance(admin, id));
        Assert.Equal(HttpStatusCode.BadRequest, (await p3.PostAsync($"/api/tournaments/{id}/play", null)).StatusCode);
        var f1 = await Play(p1, id);
        Assert.NotEqual(a1.GetProperty("puzzleId").GetInt32(), f1.GetProperty("puzzleId").GetInt32()); // đề chung kết khác

        Assert.Equal(HttpStatusCode.Forbidden, (await p1.GetAsync($"/api/tournaments/{id}/monitor")).StatusCode);
        var monitor = await admin.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}/monitor");
        Assert.Equal(2, monitor.GetArrayLength());
        Assert.Contains(monitor.EnumerateArray(), m => m.GetProperty("board").ValueKind == JsonValueKind.Object);

        Assert.Equal("Closed", await Advance(admin, id));
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        var ranks = await db.TournamentEntries.Where(e => e.TournamentId == id && e.IsFinalist)
            .OrderBy(e => e.FinalRank).Select(e => e.User.Username).ToListAsync();
        Assert.Equal(["player1", "player2"], ranks);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync($"/api/tournaments/{id}/advance", null)).StatusCode);
    }

    [Fact]
    public async Task Players_cannot_create_or_advance_and_bad_input_is_rejected()
    {
        var player = await Client("player5");
        var body = new { name = "Giải lậu", gameType = "Sudoku", difficulty = "Easy" };
        Assert.Equal(HttpStatusCode.Forbidden, (await player.PostAsJsonAsync("/api/tournaments", body)).StatusCode);

        var admin = await Client("admin");
        var bad = await admin.PostAsJsonAsync("/api/tournaments", new { name = "ab", gameType = "Sudoku", difficulty = "Easy" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsync("/api/tournaments/99999/advance", null)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/api/leaderboard/rating?game=Chess")).StatusCode);
    }

    [Fact]
    public async Task Leaderboards_list_ratings_and_score_todays_solved_daily_puzzles()
    {
        var player = await Client("player6");
        var daily = await player.GetFromJsonAsync<JsonElement>("/api/daily?game=Sudoku");
        var easy = daily.EnumerateArray().First(d => d.GetProperty("difficulty").GetString() == "Easy");
        var start = await player.PostAsync($"/api/daily/{easy.GetProperty("id").GetInt32()}/start", null);
        var attempt = await start.Content.ReadFromJsonAsync<JsonElement>();
        await SolveSudoku(player, attempt, await Solution(attempt.GetProperty("puzzleId").GetInt32()));

        var anonymous = _factory.CreateClient();
        var rating = await anonymous.GetFromJsonAsync<JsonElement>("/api/leaderboard/rating?game=Sudoku");
        Assert.True(rating.GetArrayLength() >= 9); // admin + player1..8 từ DevSeeder
        Assert.Equal(1, rating[0].GetProperty("rank").GetInt32());

        var day = await anonymous.GetFromJsonAsync<JsonElement>("/api/leaderboard/daily?game=Sudoku&period=day");
        var row = day.EnumerateArray().Single(r => r.GetProperty("username").GetString() == "player6");
        Assert.Equal(1, row.GetProperty("score").GetInt32());
        Assert.Equal(1, row.GetProperty("solvedCount").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest,
            (await anonymous.GetAsync("/api/leaderboard/daily?game=Sudoku&period=year")).StatusCode);
    }

    // ---- helpers ---------------------------------------------------------------

    private async Task<HttpClient> Client(string username)
    {
        var client = _factory.CreateClient();
        TestAuth.Use(client, await TestAuth.DevTokenAsync(client, username));
        return client;
    }

    private static async Task<string> Advance(HttpClient admin, int id)
    {
        var response = await admin.PostAsync($"/api/tournaments/{id}/advance", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString()!;
    }

    private static async Task<JsonElement> Play(HttpClient client, int id)
    {
        var response = await client.PostAsync($"/api/tournaments/{id}/play", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    // Test đọc đáp án thẳng từ database; client thật không bao giờ nhận được nó.
    private async Task<string> Solution(int puzzleId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        return (await db.Puzzles.SingleAsync(p => p.Id == puzzleId)).Solution;
    }

    private static async Task SolveSudoku(HttpClient client, JsonElement attempt, string solution)
    {
        var id = attempt.GetProperty("id").GetInt32();
        var cells = attempt.GetProperty("board").GetProperty("cells").GetString()!;
        JsonElement last = default;
        for (var i = 0; i < cells.Length; i++)
        {
            if (cells[i] != '0') continue;
            var move = await client.PostAsJsonAsync($"/api/attempts/{id}/move", new { index = i, value = solution[i] - '0' });
            Assert.Equal(HttpStatusCode.OK, move.StatusCode);
            last = await move.Content.ReadFromJsonAsync<JsonElement>();
        }
        Assert.Equal("Solved", last.GetProperty("attempt").GetProperty("status").GetString());
    }

    private static async Task FillOne(HttpClient client, JsonElement attempt, string solution)
    {
        var id = attempt.GetProperty("id").GetInt32();
        var i = attempt.GetProperty("board").GetProperty("cells").GetString()!.IndexOf('0');
        var move = await client.PostAsJsonAsync($"/api/attempts/{id}/move", new { index = i, value = solution[i] - '0' });
        Assert.Equal(HttpStatusCode.OK, move.StatusCode);
    }
}
