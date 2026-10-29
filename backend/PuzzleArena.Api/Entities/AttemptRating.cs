namespace PuzzleArena.Api.Entities;

// BE1 ledger so a finished attempt changes Elo once and history can show ratingChange.
public class AttemptRating
{
    public int Id { get; set; }
    public int AttemptId { get; set; }
    public Attempt Attempt { get; set; } = null!;
    public int UserId { get; set; }
    public int Delta { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
