using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Entities;

public class Attempt
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int PuzzleId { get; set; }
    public Puzzle Puzzle { get; set; } = null!;
    public int? TournamentId { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? Deadline { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }
    public long? DurationMs { get; set; }
    public int Mistakes { get; set; }
    public AttemptStatus Status { get; set; }
    public int Score { get; set; }
    public int Progress { get; set; }
    public string State { get; set; } = "";
    public string MoveLog { get; set; } = "";
}
