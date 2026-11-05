namespace PuzzleArena.DataAccess.Entities;

public class TournamentEntry
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTimeOffset RegisteredAt { get; set; }
    public int? QualifierRank { get; set; }
    public int? Seed { get; set; }          // hạt giống trong nhánh đấu; null = không vào nhánh đấu
    public int? EliminatedInRound { get; set; }
    public int? FinalRank { get; set; }
}
