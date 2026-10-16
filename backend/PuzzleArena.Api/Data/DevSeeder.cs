using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Api.Data;

public static class DevSeeder
{
    public const string Password = "123456";

    public static async Task SeedAsync(AppDb db, IPasswordHasher<User> hasher, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(u => u.Username == "admin", ct))
            return;

        var now = DateTimeOffset.UtcNow;
        var users = new List<User>
        {
            NewUser("admin", "admin@puzzlearena.local", Role.Admin, now, hasher),
        };
        for (var i = 1; i <= 8; i++)
        {
            users.Add(NewUser($"player{i}", $"player{i}@puzzlearena.local", Role.Player, now, hasher));
        }

        db.Users.AddRange(users);
        await db.SaveChangesAsync(ct);
    }

    private static User NewUser(string username, string email, Role role, DateTimeOffset now, IPasswordHasher<User> hasher)
    {
        var user = new User
        {
            Username = username,
            Email = email,
            Role = role,
            IsLocked = false,
            CreatedAt = now,
            Ratings =
            [
                new UserRating { GameType = GameType.Sudoku, Value = Elo.Initial },
                new UserRating { GameType = GameType.Minesweeper, Value = Elo.Initial },
            ],
        };
        user.PasswordHash = hasher.HashPassword(user, Password);
        return user;
    }
}
