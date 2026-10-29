using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace PuzzleArena.Tests;

public static class TestAuth
{
    public static async Task<string> DevTokenAsync(HttpClient client, string username)
    {
        var response = await client.PostAsJsonAsync("/api/auth/dev-login", new { username });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("token").GetString()!;
    }

    public static void Use(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }
}
