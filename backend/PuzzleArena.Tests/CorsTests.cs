using Microsoft.AspNetCore.Hosting;

namespace PuzzleArena.Tests;

/// <summary>Như khi chạy scripts/tunnel.ps1: frontend ở một địa chỉ trycloudflare.com.</summary>
public sealed class TunnelCorsFactory : ApiFactory
{
    public const string Frontend = "https://demo-abc.trycloudflare.com";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Cors:Origins:0", Frontend);
    }
}

public class CorsTests(TunnelCorsFactory factory) : IClassFixture<TunnelCorsFactory>
{
    [Theory]
    [InlineData(TunnelCorsFactory.Frontend, true)]
    [InlineData("https://evil.example.com", false)]
    [InlineData("http://localhost:3000", false)] // đã cấu hình Cors:Origins thì chỉ dùng danh sách đó
    public async Task Only_configured_frontend_origins_may_call_the_api(string origin, bool allowed)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/tournaments");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await factory.CreateClient().SendAsync(request);

        Assert.Equal(allowed, response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values) && values.Contains(origin));
    }
}

public class DefaultCorsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Without_configuration_the_local_frontend_is_allowed()
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/hubs/arena/negotiate");
        request.Headers.Add("Origin", "http://localhost:3000");
        request.Headers.Add("Access-Control-Request-Method", "POST");

        var response = await factory.CreateClient().SendAsync(request);

        Assert.Contains("http://localhost:3000", response.Headers.GetValues("Access-Control-Allow-Origin"));
        Assert.Contains("true", response.Headers.GetValues("Access-Control-Allow-Credentials")); // SignalR cần
    }
}
