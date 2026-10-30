using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Entities;

// One row per round. The puzzle is generated only when that round starts.
public class TournamentPuzzle
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    public int PuzzleId { get; set; }
    public Puzzle Puzzle { get; set; } = null!;
    public TournamentStage Stage { get; set; }
}
