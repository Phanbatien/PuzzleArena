using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Entities;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public Role Role { get; set; } = Role.Player;
    public bool IsLocked { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<UserRating> Ratings { get; set; } = [];
}
