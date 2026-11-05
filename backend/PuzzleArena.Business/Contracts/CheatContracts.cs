using PuzzleArena.DataAccess.Domain;

namespace PuzzleArena.Business.Contracts;

// GET /api/admin/attempts/suspicious?game=Sudoku&limit=50
public record SuspiciousAttemptResponse(
    int AttemptId,
    int UserId,
    string Username,
    GameType Game,
    Difficulty Difficulty,
    long? DurationMs,
    int Mistakes,
    int Moves,
    int? TournamentId,
    DateTimeOffset? FinishedAt,
    IReadOnlyList<string> Reasons);
