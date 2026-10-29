using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Entities;

public class Puzzle
{
    public int Id { get; set; }
    public GameType GameType { get; set; }
    public Difficulty Difficulty { get; set; }
    public int Seed { get; set; }
    public string BoardConfig { get; set; } = "";
    public string Solution { get; set; } = "";
    public bool IsDaily { get; set; }
    public DateOnly? DailyDate { get; set; }
}
