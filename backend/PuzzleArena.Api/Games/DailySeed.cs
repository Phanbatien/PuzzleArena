using System.Security.Cryptography;
using System.Text;
using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Games;

public static class DailySeed
{
    public static int For(DateOnly date, GameType game, Difficulty difficulty)
    {
        var bytes = Encoding.UTF8.GetBytes($"{date:yyyy-MM-dd}|{game}|{difficulty}");
        var hash = SHA256.HashData(bytes);
        return BitConverter.ToInt32(hash, 0);
    }
}
