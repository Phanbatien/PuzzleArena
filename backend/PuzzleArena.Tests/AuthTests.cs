using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Tests;

public class AuthTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AuthTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Health_returns_ok()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ok", json.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Cors_allows_frontend_origin()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/auth/login");
        request.Headers.Add("Origin", "http://localhost:3000");
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "content-type,authorization");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("http://localhost:3000", response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task Hello_returns_greeting()
    {
        var client = _factory.CreateClient();
        var json = await client.GetFromJsonAsync<JsonElement>("/api/hello/Lan");
        Assert.Equal("Xin chào Lan", json.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Register_and_login_return_numeric_id_and_token()
    {
        var client = _factory.CreateClient();
        var username = $"user{Guid.NewGuid():N}"[..12];
        var register = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username,
            email = $"{username}@example.com",
            password = "secret1",
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        var registered = await register.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Number, registered.GetProperty("user").GetProperty("id").ValueKind);
        Assert.False(string.IsNullOrEmpty(registered.GetProperty("token").GetString()));
        Assert.Equal(username, registered.GetProperty("user").GetProperty("username").GetString());
        Assert.Equal("Player", registered.GetProperty("user").GetProperty("role").GetString());

        var login = await client.PostAsJsonAsync("/api/auth/login", new { username, password = "secret1" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var loggedIn = await login.Content.ReadFromJsonAsync<JsonElement>();
        TestAuth.Use(client, loggedIn.GetProperty("token").GetString()!);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.Equal(username, me.GetProperty("username").GetString());
        Assert.Equal(0, me.GetProperty("streak").GetInt32());
    }

    [Fact]
    public async Task Register_rejects_duplicate_username()
    {
        var client = _factory.CreateClient();
        var username = $"dup{Guid.NewGuid():N}"[..12];
        var body = new { username, email = $"{username}@example.com", password = "secret1" };
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/register", body)).StatusCode);

        var second = await client.PostAsJsonAsync("/api/auth/register", body);
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        var json = await second.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Tên đăng nhập đã được sử dụng.", json.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Login_rejects_wrong_password()
    {
        var client = _factory.CreateClient();
        var username = $"bad{Guid.NewGuid():N}"[..12];
        await client.PostAsJsonAsync("/api/auth/register", new
        {
            username,
            email = $"{username}@example.com",
            password = "secret1",
        });

        var response = await client.PostAsJsonAsync("/api/auth/login", new { username, password = "nope123" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Sai mật khẩu.", json.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Login_rejects_locked_account()
    {
        var client = _factory.CreateClient();
        var username = $"lock{Guid.NewGuid():N}"[..12];
        await client.PostAsJsonAsync("/api/auth/register", new
        {
            username,
            email = $"{username}@example.com",
            password = "secret1",
        });

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDb>();
            var user = await db.Users.SingleAsync(u => u.Username == username);
            user.IsLocked = true;
            await db.SaveChangesAsync();
        }

        var response = await client.PostAsJsonAsync("/api/auth/login", new { username, password = "secret1" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Tài khoản đã bị khóa.", json.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Dev_login_works_for_seed_player()
    {
        var client = _factory.CreateClient();
        var token = await TestAuth.DevTokenAsync(client, "player1");
        TestAuth.Use(client, token);
        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.Equal("player1", me.GetProperty("username").GetString());
        Assert.Equal("Player", me.GetProperty("role").GetString());

        var ratings = await client.GetFromJsonAsync<JsonElement>("/api/me/ratings");
        Assert.Equal(2, ratings.GetArrayLength());
        Assert.Equal("Sudoku", ratings[0].GetProperty("gameType").GetString());
        Assert.Equal(1000, ratings[0].GetProperty("value").GetInt32());
        Assert.Equal("Đồng", ratings[0].GetProperty("rankName").GetString());
        Assert.Equal(1100, ratings[0].GetProperty("nextMilestone").GetInt32());
        Assert.Equal("Easy", ratings[0].GetProperty("suggestedDifficulty").GetString());
    }

    [Fact]
    public async Task Seed_password_logs_in()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            username = "admin",
            password = DevSeeder.Password,
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Admin", json.GetProperty("user").GetProperty("role").GetString());
    }
}

public class ProductionAuthTests : IClassFixture<ProductionApiFactory>
{
    private readonly ProductionApiFactory _factory;

    public ProductionAuthTests(ProductionApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Dev_login_is_not_found_outside_development()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/dev-login", new { username = "admin" });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
