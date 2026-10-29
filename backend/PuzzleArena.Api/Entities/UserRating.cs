using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Entities;

public class UserRating
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public GameType GameType { get; set; }
    public int Value { get; set; }
}
