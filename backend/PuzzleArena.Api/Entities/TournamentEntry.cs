namespace PuzzleArena.Api.Entities;

public class TournamentEntry
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTimeOffset RegisteredAt { get; set; }
    public bool IsFinalist { get; set; }
    public int? FinalRank { get; set; }
}
