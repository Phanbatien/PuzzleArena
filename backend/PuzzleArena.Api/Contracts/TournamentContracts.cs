using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Games;

namespace PuzzleArena.Api.Contracts;

// POST /api/tournaments  { "name": "...", "gameType": "Sudoku", "difficulty": "Medium", "finalistCount": 6, "roundMinutes": 15 }
public record CreateTournamentRequest(
    string? Name,
    GameType? GameType,
    Difficulty? Difficulty,
    int? FinalistCount,
    int? RoundMinutes);

public record TournamentListItem(
    int Id,
    string Name,
    GameType GameType,
    Difficulty Difficulty,
    TournamentStatus Status,
    int FinalistCount,
    int RoundMinutes,
    int ParticipantCount);

// One row of a round's leaderboard. Also the payload of the SignalR "progress" event.
public record StandingResponse(
    int Rank,
    int UserId,
    string Username,
    string Status,
    int Progress,
    int Mistakes,
    long? DurationMs,
    bool IsFinalist);

// GET /api/tournaments/{id}. Spectators get names, progress and times, never a board.
// Standings = the current round (the final once it has started), Qualifier/Final = both rounds.
public record TournamentDetailResponse(
    int Id,
    string Name,
    GameType GameType,
    Difficulty Difficulty,
    TournamentStatus Status,
    int FinalistCount,
    int RoundMinutes,
    int ParticipantCount,
    DateTimeOffset? QualifierStartedAt,
    DateTimeOffset? FinalStartedAt,
    DateTimeOffset? StageEndsAt,
    DateTimeOffset ServerNow,
    bool IsRegistered,
    bool IsFinalist,
    List<StandingResponse> Standings,
    List<StandingResponse> Qualifier,
    List<StandingResponse> Final);

// GET /api/tournaments/{id}/monitor (admin). Also the payload of the SignalR "board" event.
public record MonitorRow(
    int UserId,
    string Username,
    int Progress,
    int Mistakes,
    AttemptStatus Status,
    int? FinishRank,
    BoardView? Board);

public record RatingLeaderboardRow(int Rank, int UserId, string Username, int Rating, int SolvedCount);

// Score: Easy 1 / Medium 2 / Hard 3 points per solved daily puzzle in the period.
public record DailyLeaderboardRow(
    int Rank,
    int UserId,
    string Username,
    int Score,
    int SolvedCount,
    long TotalDurationMs,
    int Mistakes);
