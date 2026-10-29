using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Entities;

public class BoosterGrant
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public BoosterType Type { get; set; }
    public int Amount { get; set; }
    public string Reason { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}
