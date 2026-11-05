using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PuzzleArena.DataAccess;
using PuzzleArena.DataAccess.Domain;
using PuzzleArena.DataAccess.Entities;
using PuzzleArena.Business.Games;
using PuzzleArena.Business.Rating;
using PuzzleArena.Business.Tournaments;

namespace PuzzleArena.Tests;

/// <summary>Không trễ khán giả, không nghỉ giữa vòng: để test chạy hết một giải ngay lập tức.</summary>
public sealed class FastTournamentFactory : ApiFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Tournaments:SpectatorDelaySeconds", "0");
        builder.UseSetting("Tournaments:RoundBreakSeconds", "0");
        builder.UseSetting("Tournaments:CountdownSeconds", "0");
    }
}

/// <summary>Khán giả trễ 2 giây (thay vì 30) để test kiểm tra được cả lúc "chưa thấy" lẫn "đã thấy".</summary>
public sealed class ShortDelayFactory : ApiFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Tournaments:SpectatorDelaySeconds", "2");
        builder.UseSetting("Tournaments:RoundBreakSeconds", "0");
        builder.UseSetting("Tournaments:CountdownSeconds", "0");
    }
}

public class SpectatorDelayTests : IClassFixture<ShortDelayFactory>
{
    private readonly ShortDelayFactory _factory;

    public SpectatorDelayTests(ShortDelayFactory factory) => _factory = factory;

    [Fact]
    public async Task Spectators_see_the_match_and_every_move_only_after_the_delay()
    {
        var admin = await H.Client(_factory, "admin");
        var id = await H.Create(admin, bracketSize: 4);
        var p7 = await H.Client(_factory, "player7");
        var p8 = await H.Client(_factory, "player8");
        await H.Register(p7, id);
        await H.Register(p8, id);
        await H.Advance(admin, id);
        await H.Enter(p7, id);
        await H.Play(p8, id);
        var attempt = await H.Play(p7, id);
        var spectator = _factory.CreateClient();

        // Trận vừa bắt đầu: theo dòng thời gian trễ thì trận chưa bắt đầu.
        var early = await spectator.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}/live");
        Assert.Equal(2, early.GetProperty("delaySeconds").GetInt32());
        Assert.Equal(0, early.GetProperty("matches").GetArrayLength());

        await Task.Delay(2500);
        await H.FillOne(p7, attempt, await H.Solution(_factory, attempt.GetProperty("puzzleId").GetInt32()));

        // Trận đã hiện, nhưng nước vừa đi chưa hiện.
        var before = await spectator.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}/live");
        Assert.Equal(2, before.GetProperty("matches")[0].GetProperty("players").GetArrayLength());
        Assert.Equal(0, Player(before, "player7").GetProperty("progress").GetInt32());

        await Task.Delay(2500);
        var after = await spectator.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}/live");
        Assert.True(Player(after, "player7").GetProperty("progress").GetInt32() > 0);

        // Người đang đấu không xem được trận của chính mình (sẽ thấy bàn đối thủ, cùng đề).
        var own = await p8.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}/live");
        Assert.Equal(0, own.GetProperty("matches").GetArrayLength());
    }

    private static JsonElement Player(JsonElement live, string name) =>
        live.GetProperty("matches")[0].GetProperty("players").EnumerateArray().Single(p => p.GetProperty("username").GetString() == name);
}

public class BracketTests
{
    [Fact]
    public void Seed_order_keeps_top_seeds_apart_until_the_final()
    {
        Assert.Equal([1, 4, 2, 3], Bracket.SeedOrder(4));
        Assert.Equal([1, 8, 4, 5, 2, 7, 3, 6], Bracket.SeedOrder(8));
        Assert.Equal(16, Bracket.SeedOrder(16).Distinct().Count());
    }

    [Fact]
    public void Plan_uses_byes_for_small_fields_and_a_qualifier_for_big_ones()
    {
        Assert.Equal((false, 3, 2, 1), Bracket.Plan(3, 16));   // 4 suất, hạt giống 1 miễn vòng 1
        Assert.Equal((false, 16, 4, 0), Bracket.Plan(16, 16));
        Assert.Equal((true, 16, 4, 0), Bracket.Plan(40, 16));  // vòng loại, top 16 vào nhánh
        Assert.Equal("Chung kết", Bracket.RoundName(3, 3));
        Assert.Equal("Bán kết", Bracket.RoundName(2, 3));
        Assert.Equal("Vòng 1/8", Bracket.RoundName(1, 4));
        Assert.Equal(2, Bracket.RankWhenEliminated(3, 3));
        Assert.Equal(3, Bracket.RankWhenEliminated(2, 3));
        Assert.Equal(5, Bracket.RankWhenEliminated(1, 3));
    }

    [Fact]
    public void On_time_higher_progress_wins_then_fewer_mistakes_then_better_seed()
    {
        Attempt A(int progress, int mistakes) => new() { Progress = progress, Mistakes = mistakes };
        Assert.True(Bracket.DecideOnTime(A(60, 2), 4, A(50, 0), 1).FirstWins);
        Assert.False(Bracket.DecideOnTime(A(60, 2), 1, A(60, 1), 4).FirstWins);
        Assert.True(Bracket.DecideOnTime(A(60, 1), 1, A(60, 1), 4).FirstWins);
    }

    [Fact]
    public void Replay_shows_the_board_as_it_was_at_that_moment()
    {
        var puzzle = GameEngine.Generate(GameType.Sudoku, Difficulty.Easy, 7);
        int i = puzzle.BoardConfig.IndexOf('0'), j = puzzle.BoardConfig.IndexOf('0', i + 1);
        int right = puzzle.Solution[i] - '0', wrong = puzzle.Solution[j] == '1' ? 2 : 1;
        var start = DateTimeOffset.UnixEpoch;
        var attempt = new Attempt
        {
            UserId = 1, StartedAt = start, Status = AttemptStatus.InProgress,
            MoveLog = $"1000|{i}|{right}|C\n5000|{j}|{wrong}|W\n",
        };

        var before = Replay.At(attempt, puzzle, "a", 1, start.AddMilliseconds(500));
        var middle = Replay.At(attempt, puzzle, "a", 1, start.AddSeconds(2));
        var after = Replay.At(attempt, puzzle, "a", 1, start.AddSeconds(6));

        Assert.Equal('0', before.Board!.Cells[i]);
        Assert.Equal((char)('0' + right), middle.Board!.Cells[i]);
        Assert.Equal(0, middle.Mistakes);
        Assert.Equal(1, after.Mistakes);
        Assert.Equal('0', after.Board!.Cells[j]); // nước sai không ghi vào bàn
    }
}

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
        Assert.Equal("NotStarted", ranked[^1].Status);
    }

    [Fact]
    public async Task Create_validates_schedule_and_format_and_only_admins_create()
    {
        var player = await H.Client(_factory, "player5");
        var ok = new { name = "Giải lậu", gameType = "Sudoku", difficulty = "Easy", startsAt = DateTimeOffset.UtcNow.AddHours(1) };
        Assert.Equal(HttpStatusCode.Forbidden, (await player.PostAsJsonAsync("/api/tournaments", ok)).StatusCode);

        var admin = await H.Client(_factory, "admin");
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/tournaments",
            new { name = "Giải A", gameType = "Sudoku", difficulty = "Easy" })).StatusCode); // thiếu giờ bắt đầu
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/tournaments",
            new { name = "Giải A", gameType = "Sudoku", difficulty = "Easy", startsAt = DateTimeOffset.UtcNow.AddHours(1), bracketSize = 6 })).StatusCode);

        var created = await admin.PostAsJsonAsync("/api/tournaments", new
        {
            name = "Giải tối thứ Sáu", gameType = "Sudoku", difficulty = "Medium",
            startsAt = DateTimeOffset.UtcNow.AddHours(2), bracketSize = 8, roundMinutes = 7, description = "Mỗi người một máy.",
        });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();

        var detail = await _factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}");
        Assert.Equal("Open", detail.GetProperty("status").GetString());
        Assert.Equal("Mỗi người một máy.", detail.GetProperty("description").GetString());
        Assert.Contains("7 phút", detail.GetProperty("formatSummary").GetString());
        Assert.Equal(30, detail.GetProperty("spectatorDelaySeconds").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync($"/api/tournaments/{id}/advance", null)).StatusCode); // < 2 người
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsync("/api/tournaments/99999/advance", null)).StatusCode);

        var list = await _factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/tournaments");
        var item = list.EnumerateArray().Single(t => t.GetProperty("id").GetInt32() == id);
        Assert.Equal(8, item.GetProperty("bracketSize").GetInt32());
        Assert.False(string.IsNullOrEmpty(item.GetProperty("formatSummary").GetString()));
    }

}

public class KnockoutFlowTests : IClassFixture<FastTournamentFactory>
{
    private readonly FastTournamentFactory _factory;

    public KnockoutFlowTests(FastTournamentFactory factory) => _factory = factory;

    [Fact]
    public async Task Three_players_get_a_four_slot_bracket_with_a_bye_and_play_down_to_a_champion()
    {
        var admin = await H.Client(_factory, "admin");
        var id = await H.Create(admin, bracketSize: 4);
        var p1 = await H.Client(_factory, "player1");
        var p2 = await H.Client(_factory, "player2");
        var p3 = await H.Client(_factory, "player3");
        var outsider = await H.Client(_factory, "player4");
        foreach (var c in new[] { p1, p2, p3 }) await H.Register(c, id);

        var round1 = await H.Advance(admin, id);
        Assert.Equal("Knockout", round1);
        Assert.Equal(HttpStatusCode.BadRequest, (await outsider.PostAsync($"/api/tournaments/{id}/register", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await outsider.PostAsync($"/api/tournaments/{id}/play", null)).StatusCode);

        // Cùng 1000 điểm hạng -> hạt giống theo thứ tự đăng ký: player1 (hạt giống 1) được miễn vòng 1.
        var detail = await _factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}");
        var semis = detail.GetProperty("bracket")[0];
        Assert.Equal("Bán kết", semis.GetProperty("name").GetString());
        var bye = semis.GetProperty("matches")[0];
        Assert.Equal("Done", bye.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, bye.GetProperty("player2").ValueKind);
        Assert.Equal(HttpStatusCode.BadRequest, (await p1.PostAsync($"/api/tournaments/{id}/play", null)).StatusCode);

        // Phòng chờ: player2 vào trước thì phải chờ, chưa có đề, khán giả chưa thấy trận.
        Assert.Equal(HttpStatusCode.Accepted, (await p2.PostAsync($"/api/tournaments/{id}/play", null)).StatusCode);
        var waiting = (await p2.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}")).GetProperty("myMatch");
        Assert.False(waiting.GetProperty("started").GetBoolean());
        Assert.True(waiting.GetProperty("ready").GetBoolean());
        Assert.False(waiting.GetProperty("opponentReady").GetBoolean());
        Assert.Equal(0, (await outsider.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}/live")).GetProperty("matches").GetArrayLength());

        var a3 = await H.Play(p3, id); // đủ hai người: trận bắt đầu, cùng một giờ cho cả hai
        var a2 = await H.Play(p2, id);
        Assert.Equal(a2.GetProperty("puzzleId").GetInt32(), a3.GetProperty("puzzleId").GetInt32()); // hai người cùng một đề
        Assert.Equal(a2.GetProperty("startedAt").GetString(), a3.GetProperty("startedAt").GetString());
        var abandon = await p3.PostAsync($"/api/attempts/{a3.GetProperty("id").GetInt32()}/abandon", null);
        Assert.Equal(HttpStatusCode.BadRequest, abandon.StatusCode); // đang thi đấu không được bỏ cuộc
        Assert.Equal(1, (await outsider.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}/live")).GetProperty("matches").GetArrayLength());

        // player2 giải xong trước -> thắng; player3 bị dừng lượt và bị loại; chung kết bắt đầu ngay (nghỉ 0 giây trong test).
        await H.Solve(p2, a2, await H.Solution(_factory, a2.GetProperty("puzzleId").GetInt32()));
        var a3After = await p3.GetFromJsonAsync<JsonElement>($"/api/attempts/{a3.GetProperty("id").GetInt32()}");
        Assert.Equal("Failed", a3After.GetProperty("status").GetString());

        detail = await p1.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}");
        Assert.Equal(2, detail.GetProperty("currentRound").GetInt32());
        Assert.Equal("Live", detail.GetProperty("myMatch").GetProperty("status").GetString());
        Assert.Equal("player2", detail.GetProperty("myMatch").GetProperty("opponent").GetProperty("username").GetString());
        Assert.Equal("Giải xong trước", detail.GetProperty("bracket")[0].GetProperty("matches")[1].GetProperty("note").GetString());

        // Chung kết: player1 sai 3 lần -> thua, player2 vô địch.
        await H.Enter(p1, id);
        await H.Play(p2, id);
        var f1 = await H.Play(p1, id);
        await H.Lose(p1, f1, await H.Solution(_factory, f1.GetProperty("puzzleId").GetInt32()));

        detail = await _factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}");
        Assert.Equal("Closed", detail.GetProperty("status").GetString());
        Assert.Equal("player2", detail.GetProperty("champion").GetProperty("username").GetString());
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        var ranks = await db.TournamentEntries.Where(e => e.TournamentId == id)
            .OrderBy(e => e.FinalRank).Select(e => new { e.User.Username, e.FinalRank }).ToListAsync();
        Assert.Equal([("player2", 1), ("player1", 2), ("player3", 3)], ranks.Select(r => (r.Username, r.FinalRank ?? 0)));

        Assert.Equal(HttpStatusCode.Forbidden, (await p1.GetAsync($"/api/tournaments/{id}/monitor")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync($"/api/tournaments/{id}/monitor")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync($"/api/tournaments/{id}/advance", null)).StatusCode);
    }

    [Fact]
    public async Task The_clock_starts_the_tournament_by_itself_at_the_scheduled_time()
    {
        var admin = await H.Client(_factory, "admin");
        var created = await admin.PostAsJsonAsync("/api/tournaments", new
        {
            name = "Giải tự chạy", gameType = "Sudoku", difficulty = "Easy",
            startsAt = DateTimeOffset.UtcNow.AddSeconds(2), bracketSize = 4, roundMinutes = 30,
        });
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        await H.Register(await H.Client(_factory, "player7"), id);
        await H.Register(await H.Client(_factory, "player8"), id);

        string? status = null;
        for (var i = 0; i < 40 && status != "Knockout"; i++)
        {
            await Task.Delay(250);
            status = (await _factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}")).GetProperty("status").GetString();
        }
        Assert.Equal("Knockout", status); // không ai bấm "chuyển vòng"
    }

    [Fact]
    public async Task More_players_than_slots_play_a_shared_qualifier_and_the_top_go_to_the_bracket()
    {
        var admin = await H.Client(_factory, "admin");
        var id = await H.Create(admin, bracketSize: 4);
        var names = new[] { "player1", "player2", "player3", "player4", "player5" };
        var clients = new Dictionary<string, HttpClient>();
        foreach (var n in names)
        {
            clients[n] = await H.Client(_factory, n);
            await H.Register(clients[n], id);
        }

        Assert.Equal("Qualifier", await H.Advance(admin, id));
        var attempts = new Dictionary<string, JsonElement>();
        foreach (var n in names.Take(4)) attempts[n] = await H.Play(clients[n], id); // player5 không vào thi
        var solution = await H.Solution(_factory, attempts["player1"].GetProperty("puzzleId").GetInt32());

        // Đang thi vòng loại (mọi người cùng đề) thì không được xem bàn người khác; khán giả thì xem được.
        Assert.Equal(HttpStatusCode.Forbidden, (await clients["player2"].GetAsync($"/api/tournaments/{id}/live")).StatusCode);
        var spectator = await H.Client(_factory, "player6");
        Assert.Equal(4, (await spectator.GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}/live")).GetProperty("qualifier").GetArrayLength());

        await H.Solve(clients["player3"], attempts["player3"], solution);
        await H.FillOne(clients["player1"], attempts["player1"], solution);

        Assert.Equal("Knockout", await H.Advance(admin, id)); // đóng vòng loại; nghỉ 0 giây nên vòng 1 bắt đầu ngay
        var detail = await _factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}");
        var standings = detail.GetProperty("standings").EnumerateArray().ToList();
        Assert.Equal("player3", standings[0].GetProperty("username").GetString());
        Assert.Equal("player1", standings[1].GetProperty("username").GetString());
        Assert.False(standings.Single(s => s.GetProperty("username").GetString() == "player5").GetProperty("qualified").GetBoolean());

        var semis = detail.GetProperty("bracket")[0].GetProperty("matches").EnumerateArray().ToList();
        Assert.All(semis, m => Assert.Equal("Live", m.GetProperty("status").GetString()));
        Assert.Equal("player3", semis[0].GetProperty("player1").GetProperty("username").GetString()); // hạt giống 1 = nhất vòng loại
        Assert.Equal(1, semis[0].GetProperty("player1").GetProperty("seed").GetInt32());
        Assert.Equal(4, semis[0].GetProperty("player2").GetProperty("seed").GetInt32());
        Assert.DoesNotContain(semis, m => m.GetRawText().Contains("player5"));

        // Hai trận khác nhau là hai đề khác nhau: xem trận khác không giúp gì cho trận của mình.
        foreach (var n in new[] { "player3", "player1", "player2", "player4" }) await H.Enter(clients[n], id);
        var m1 = await H.Play(clients["player3"], id);
        var m2 = await H.Play(clients["player1"], id);
        Assert.NotEqual(m1.GetProperty("puzzleId").GetInt32(), m2.GetProperty("puzzleId").GetInt32());
    }
}

public class NoShowTests(FastTournamentFactory factory) : IClassFixture<FastTournamentFactory>
{
    [Fact]
    public async Task A_player_who_never_enters_the_match_loses_it()
    {
        var admin = await H.Client(factory, "admin");
        var id = await H.Create(admin, bracketSize: 4);
        var p5 = await H.Client(factory, "player5");
        var p6 = await H.Client(factory, "player6");
        await H.Register(p5, id);
        await H.Register(p6, id);
        await H.Advance(admin, id);

        await H.Enter(p6, id);           // chỉ player6 vào phòng
        await H.Advance(admin, id);      // hết giờ vào phòng (admin ép)

        var detail = await factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/tournaments/{id}");
        Assert.Equal("Closed", detail.GetProperty("status").GetString());
        Assert.Equal("player6", detail.GetProperty("champion").GetProperty("username").GetString());
        Assert.Equal("Đối thủ không vào trận", detail.GetProperty("bracket")[0].GetProperty("matches")[0].GetProperty("note").GetString());
    }
}

/// <summary>Đếm ngược 2 giây trước khi trận bắt đầu.</summary>
public sealed class CountdownFactory : ApiFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Tournaments:CountdownSeconds", "2");
    }
}

public class CountdownTests(CountdownFactory factory) : IClassFixture<CountdownFactory>
{
    [Fact]
    public async Task Both_players_start_at_the_same_moment_and_see_nothing_before_it()
    {
        var admin = await H.Client(factory, "admin");
        var id = await H.Create(admin, bracketSize: 4);
        var p1 = await H.Client(factory, "player1");
        var p2 = await H.Client(factory, "player2");
        await H.Register(p1, id);
        await H.Register(p2, id);
        await H.Advance(admin, id);
        await H.Enter(p1, id);
        var a2 = await H.Play(p2, id);
        var a1 = await H.Play(p1, id);

        Assert.Equal(a1.GetProperty("startedAt").GetString(), a2.GetProperty("startedAt").GetString());
        Assert.True(DateTimeOffset.Parse(a1.GetProperty("startedAt").GetString()!) > DateTimeOffset.Parse(a1.GetProperty("serverNow").GetString()!));
        var hidden = a1.GetProperty("board").GetProperty("cells").GetString()!;
        Assert.All(hidden, c => Assert.Equal('0', c)); // chưa tới giờ: chưa thấy đề
        var early = await p1.PostAsJsonAsync($"/api/attempts/{a1.GetProperty("id").GetInt32()}/move", new { index = 0, value = 1 });
        Assert.Equal(HttpStatusCode.BadRequest, early.StatusCode);
        Assert.Contains("chưa bắt đầu", (await early.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetString());

        await Task.Delay(2300);
        var started = await p1.GetFromJsonAsync<JsonElement>($"/api/attempts/{a1.GetProperty("id").GetInt32()}");
        Assert.Contains(started.GetProperty("board").GetProperty("cells").GetString()!, c => c != '0'); // giờ đã thấy đề
        await H.FillOne(p1, started, await H.Solution(factory, started.GetProperty("puzzleId").GetInt32()));
    }
}

public class DailyLeaderboardTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public DailyLeaderboardTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Leaderboards_list_ratings_and_score_daily_by_elo_gained()
    {
        var player = await H.Client(_factory, "player6");
        var start = await player.PostAsJsonAsync("/api/daily/start", new { game = "Sudoku", difficulty = "Easy" });
        var attempt = await start.Content.ReadFromJsonAsync<JsonElement>();
        await H.Solve(player, attempt, await H.Solution(_factory, attempt.GetProperty("puzzleId").GetInt32()));

        var anonymous = _factory.CreateClient();
        var rating = await anonymous.GetFromJsonAsync<JsonElement>("/api/leaderboard/rating?game=Sudoku");
        Assert.True(rating.GetArrayLength() >= 9); // admin + player1..8 từ DevSeeder
        Assert.Equal(1, rating[0].GetProperty("rank").GetInt32());

        var day = await anonymous.GetFromJsonAsync<JsonElement>("/api/leaderboard/daily?game=Sudoku&period=day");
        var row = day.EnumerateArray().Single(r => r.GetProperty("username").GetString() == "player6");
        Assert.Equal(Elo.Delta(Elo.Initial, Elo.PuzzleRating(Difficulty.Easy), won: true), row.GetProperty("score").GetInt32());
        Assert.Equal(1, row.GetProperty("solvedCount").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest, (await anonymous.GetAsync("/api/leaderboard/daily?game=Sudoku&period=year")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await anonymous.GetAsync("/api/leaderboard/rating?game=Chess")).StatusCode);
    }
}

internal static class H
{
    public static async Task<HttpClient> Client(ApiFactory factory, string username)
    {
        var client = factory.CreateClient();
        TestAuth.Use(client, await TestAuth.DevTokenAsync(client, username));
        return client;
    }

    public static async Task<int> Create(HttpClient admin, int bracketSize)
    {
        var response = await admin.PostAsJsonAsync("/api/tournaments", new
        {
            name = "Giải thử", gameType = "Sudoku", difficulty = "Easy",
            startsAt = DateTimeOffset.UtcNow.AddHours(1), bracketSize, roundMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    public static async Task Register(HttpClient client, int id) =>
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/tournaments/{id}/register", null)).StatusCode);

    public static async Task<string> Advance(HttpClient admin, int id)
    {
        var response = await admin.PostAsync($"/api/tournaments/{id}/advance", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString()!;
    }

    // Vào phòng chờ của trận: 202 nếu đối thủ chưa vào, 200 nếu trận đã bắt đầu.
    public static async Task Enter(HttpClient client, int id)
    {
        var response = await client.PostAsync($"/api/tournaments/{id}/play", null);
        Assert.Contains(response.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Accepted });
    }

    public static async Task<JsonElement> Play(HttpClient client, int id)
    {
        var response = await client.PostAsync($"/api/tournaments/{id}/play", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    // Test đọc đáp án thẳng từ database; client thật không bao giờ nhận được nó.
    public static async Task<string> Solution(ApiFactory factory, int puzzleId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        return (await db.Puzzles.SingleAsync(p => p.Id == puzzleId)).Solution;
    }

    public static async Task Solve(HttpClient client, JsonElement attempt, string solution)
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

    public static async Task FillOne(HttpClient client, JsonElement attempt, string solution)
    {
        var id = attempt.GetProperty("id").GetInt32();
        var i = attempt.GetProperty("board").GetProperty("cells").GetString()!.IndexOf('0');
        var move = await client.PostAsJsonAsync($"/api/attempts/{id}/move", new { index = i, value = solution[i] - '0' });
        Assert.Equal(HttpStatusCode.OK, move.StatusCode);
    }

    public static async Task Lose(HttpClient client, JsonElement attempt, string solution)
    {
        var id = attempt.GetProperty("id").GetInt32();
        var i = attempt.GetProperty("board").GetProperty("cells").GetString()!.IndexOf('0');
        var wrong = solution[i] == '1' ? 2 : 1;
        for (var k = 0; k < 3; k++)
            await client.PostAsJsonAsync($"/api/attempts/{id}/move", new { index = i, value = wrong });
    }
}
