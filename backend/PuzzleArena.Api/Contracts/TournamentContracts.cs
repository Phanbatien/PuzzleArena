using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Games;

namespace PuzzleArena.Api.Contracts;

// POST /api/tournaments
// { "name": "...", "gameType": "Sudoku", "difficulty": "Medium", "startsAt": "2026-11-10T13:00:00Z",
//   "bracketSize": 16, "roundMinutes": 10, "description": "Luật riêng (không bắt buộc)" }
public record CreateTournamentRequest(
    string? Name,
    GameType? GameType,
    Difficulty? Difficulty,
    DateTimeOffset? StartsAt,
    int? BracketSize,
    int? RoundMinutes,
    string? Description);

public record TournamentListItem(
    int Id,
    string Name,
    GameType GameType,
    Difficulty Difficulty,
    TournamentStatus Status,
    DateTimeOffset StartsAt,
    int BracketSize,
    int RoundMinutes,
    int ParticipantCount,
    string FormatSummary);

// Một dòng bảng xếp hạng vòng loại. Cũng là payload của event SignalR "progress".
public record StandingResponse(
    int Rank,
    int UserId,
    string Username,
    string Status,
    int Progress,
    int Mistakes,
    long? DurationMs,
    bool Qualified);

// Lịch thi đấu: vòng loại (nếu có) rồi từng vòng loại trực tiếp. StartsAt là giờ dự kiến cho vòng chưa tới.
public record ScheduleItem(string Name, DateTimeOffset? StartsAt, DateTimeOffset? EndsAt, string Status);

public record MatchPlayer(int UserId, string Username, int? Seed);

public record MatchResponse(
    int Id,
    int Round,
    int Slot,
    MatchStatus Status,
    MatchPlayer? Player1,
    MatchPlayer? Player2,
    int? WinnerId,
    string? Note,
    DateTimeOffset? StartedAt,
    DateTimeOffset? FinishedAt);

public record BracketRound(int Round, string Name, DateTimeOffset? StartsAt, List<MatchResponse> Matches);

// Trận của người đang xem (nếu có): để FE hiện nút "Vào thi" và đếm ngược tới giờ trận.
public record MyMatchResponse(int MatchId, int Round, string RoundName, MatchStatus Status, MatchPlayer? Opponent, bool? Won);

// GET /api/tournaments/{id}
public record TournamentDetailResponse(
    int Id,
    string Name,
    string Description,
    GameType GameType,
    Difficulty Difficulty,
    TournamentStatus Status,
    DateTimeOffset StartsAt,
    int BracketSize,
    int RoundMinutes,
    int ParticipantCount,
    string FormatSummary,
    List<ScheduleItem> Schedule,
    int CurrentRound,
    int RoundCount,
    DateTimeOffset? RoundStartsAt,
    DateTimeOffset? StageEndsAt,
    DateTimeOffset ServerNow,
    int SpectatorDelaySeconds,
    bool IsRegistered,
    MyMatchResponse? MyMatch,
    string? ClosedNote,
    List<StandingResponse> Standings,
    List<BracketRound> Bracket,
    MatchPlayer? Champion);

// Bàn chơi một người: dùng cho màn hình admin (thời gian thực) và khán giả (trễ SpectatorDelaySeconds).
public record PlayerBoard(
    int UserId,
    string Username,
    int? Seed,
    int Progress,
    int Mistakes,
    AttemptStatus Status,
    BoardView? Board);

public record LiveMatch(int MatchId, int Round, string RoundName, MatchStatus Status, int? WinnerId, List<PlayerBoard> Players);

// GET /api/tournaments/{id}/live: khán giả xem, mọi số liệu là trạng thái tại AsOf = bây giờ - DelaySeconds.
public record LiveResponse(
    int TournamentId,
    TournamentStatus Status,
    int DelaySeconds,
    DateTimeOffset AsOf,
    List<LiveMatch> Matches,
    List<PlayerBoard> Qualifier);

// GET /api/tournaments/{id}/monitor (admin, thời gian thực). Cũng là payload của event "board".
public record MonitorRow(
    int? MatchId,
    int UserId,
    string Username,
    int Progress,
    int Mistakes,
    AttemptStatus Status,
    int? FinishRank,
    BoardView? Board);

public record RatingLeaderboardRow(int Rank, int UserId, string Username, int Rating, int SolvedCount);

// Score: tổng Elo kiếm được từ daily trong kỳ (có thể âm). SolvedCount, TotalDurationMs chỉ tính lượt giải xong.
public record DailyLeaderboardRow(
    int Rank,
    int UserId,
    string Username,
    int Score,
    int SolvedCount,
    long TotalDurationMs,
    int Mistakes);
