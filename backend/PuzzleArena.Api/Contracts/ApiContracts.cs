using System.Text.Json;
using System.Text.Json.Serialization;
using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Contracts;

public record ErrorResponse(string Error);

public record RegisterRequest(string? Username, string? Email, string? Password);

public record LoginRequest(string? Username, string? Password);

public record DevLoginRequest(string? Username);

public record UserResponse(int Id, string Username, Role Role);

public record AuthResponse(string Token, UserResponse User);

public record MeResponse(int Id, string Username, Role Role, int Streak);

public record RatingResponse(
    GameType GameType,
    int Value,
    string RankName,
    int? NextMilestone,
    Difficulty SuggestedDifficulty);

public record MissionResponse(
    string Id,
    string Period,
    string Title,
    int Progress,
    int Target,
    bool Completed,
    BoosterType RewardType,
    int RewardAmount,
    bool RewardClaimed);

public record HistoryResponse(
    int AttemptId,
    GameType GameType,
    Difficulty Difficulty,
    DateTimeOffset StartedAt,
    long? DurationMs,
    int Mistakes,
    AttemptStatus Status,
    int? RatingChange);

public record DailyPuzzleResponse(
    int Id,
    GameType GameType,
    Difficulty Difficulty,
    DateOnly DailyDate,
    int RatingIfSolved,
    int RatingIfFailed,
    string Status,
    int? AttemptId);

public record BoosterBalanceResponse(BoosterType Type, int Amount);

public record GrantRequest(int UserId, BoosterType Type, int Amount);

public record AdminUserResponse(int Id, string Username, Role Role, bool IsLocked, DateTimeOffset CreatedAt);

public record LockRequest(bool IsLocked);

public record RoleRequest(Role Role);

public static class ApiJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };
}

public static class ApiResults
{
    public static IResult Error(string message, int statusCode) =>
        Results.Json(new ErrorResponse(message), ApiJson.Options, statusCode: statusCode);
}
