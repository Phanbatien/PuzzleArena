using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Entities;

public class Tournament
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public GameType GameType { get; set; }
    public Difficulty Difficulty { get; set; }
    public TournamentStatus Status { get; set; } = TournamentStatus.Open;
    public int FinalistCount { get; set; } = 6;
    public int RoundMinutes { get; set; } = 15;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? QualifierStartedAt { get; set; }
    public DateTimeOffset? FinalStartedAt { get; set; }
    public List<TournamentPuzzle> Puzzles { get; set; } = [];
    public List<TournamentEntry> Entries { get; set; } = [];
}
