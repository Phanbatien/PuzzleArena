using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Games;

namespace PuzzleArena.Api.Endpoints;

// Chống gian lận cho admin. Tách file riêng để không đụng AdminEndpoints của BE1.
public static class AdminAttemptEndpoints
{
    public static void MapAdminAttemptEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin/attempts")
            .RequireAuthorization(policy => policy.RequireRole(nameof(Role.Admin)));
        group.MapGet("/suspicious", Suspicious);
        group.MapPost("/{id:int}/void", Void);
    }

    private static async Task<IResult> Suspicious(
        string? game,
        int? limit,
        AttemptService attempts,
        CancellationToken ct)
    {
        GameType? gameType = null;
        if (!string.IsNullOrWhiteSpace(game))
        {
            if (!Enum.TryParse<GameType>(game, ignoreCase: false, out var parsed))
                return ApiResults.Error("Loại game không hợp lệ.", StatusCodes.Status400BadRequest);
            gameType = parsed;
        }

        int take = Math.Clamp(limit ?? 50, 1, 200);
        return Results.Ok(await attempts.ListSuspicious(gameType, take, ct));
    }

    private static async Task<IResult> Void(int id, AttemptService attempts, CancellationToken ct)
    {
        var result = await attempts.Void(id, ct);
        if (result.Error is not null)
            return ApiResults.Error(result.Error, result.Status);

        return Results.Ok(await attempts.ToResponse(result.Attempt!, ct));
    }
}
