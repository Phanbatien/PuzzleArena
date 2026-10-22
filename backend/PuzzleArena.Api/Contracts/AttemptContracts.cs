using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Games;

namespace PuzzleArena.Api.Contracts;

// POST /api/practice  { "game": "Sudoku", "difficulty": "Easy" }
public record PracticeRequest(GameType? Game, Difficulty? Difficulty);

// POST /api/attempts/{id}/move  { "index": 12, "value": 5 }
// Sudoku: value 1..9. Dò mìn: value = 0 (mở ô). Cắm cờ là việc của client, không gửi lên server.
public record MoveRequest(int Index, int Value);

public record AttemptResponse(
    int Id,
    int PuzzleId,
    GameType Game,
    Difficulty Difficulty,
    AttemptStatus Status,
    int Mistakes,
    int MaxMistakes,
    int Progress,
    DateTimeOffset StartedAt,
    DateTimeOffset? Deadline,
    DateTimeOffset? FinishedAt,
    long? DurationMs,
    DateTimeOffset ServerNow,
    int? RatingDelta,
    BoardView Board);

public record MoveResponse(bool Correct, bool Shielded, AttemptResponse Attempt);
