using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Games;

namespace PuzzleArena.Api.Endpoints;

public static class AttemptEndpoints
{
    public static void MapAttemptEndpoints(this WebApplication app)
    {
        app.MapPost("/api/practice", Practice).RequireAuthorization();
        app.MapGet("/api/attempts/{id:int}", Get).RequireAuthorization();
        app.MapPost("/api/attempts/{id:int}/move", Move).RequireAuthorization();
        app.MapPost("/api/attempts/{id:int}/abandon", Abandon).RequireAuthorization();
        app.MapPost("/api/daily/{puzzleId:int}/start", StartDaily).RequireAuthorization();
    }

    // Nút "Chơi ngay" ở /daily: tạo lượt từ đề daily (hoặc trả lại lượt đã có) rồi FE chuyển sang /play/{id}.
    private static async Task<IResult> StartDaily(
        int puzzleId,
        HttpContext http,
        AttemptService attempts,
        CancellationToken ct)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null) return Unauthorized();

        var result = await attempts.StartDaily(userId.Value, puzzleId, ct);
        return await Respond(result, attempts, isMove: false, ct);
    }

    private static async Task<IResult> Practice(
        PracticeRequest request,
        HttpContext http,
        AttemptService attempts,
        IPuzzleGenerator generator,
        CancellationToken ct)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null) return Unauthorized();

        if (request.Game is null || request.Difficulty is null)
            return ApiResults.Error("Thiếu loại game hoặc độ khó.", StatusCodes.Status400BadRequest);

        var puzzle = generator.Generate(request.Game.Value, request.Difficulty.Value, Random.Shared.Next());
        puzzle.IsDaily = false;
        puzzle.DailyDate = null;

        var attempt = await attempts.Start(userId.Value, puzzle, ct: ct);
        return Results.Ok(await attempts.ToResponse(attempt, ct));
    }

    private static async Task<IResult> Get(
        int id,
        HttpContext http,
        AttemptService attempts,
        CancellationToken ct)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null) return Unauthorized();

        var result = await attempts.Get(userId.Value, http.User.IsInRole(nameof(Role.Admin)), id, ct);
        return await Respond(result, attempts, isMove: false, ct);
    }

    private static async Task<IResult> Move(
        int id,
        MoveRequest request,
        HttpContext http,
        AttemptService attempts,
        CancellationToken ct)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null) return Unauthorized();

        var result = await attempts.Move(userId.Value, id, request.Index, request.Value, ct);
        return await Respond(result, attempts, isMove: true, ct);
    }

    private static async Task<IResult> Abandon(
        int id,
        HttpContext http,
        AttemptService attempts,
        CancellationToken ct)
    {
        var userId = AuthEndpoints.CurrentUserId(http);
        if (userId is null) return Unauthorized();

        var result = await attempts.Abandon(userId.Value, id, ct);
        return await Respond(result, attempts, isMove: false, ct);
    }

    private static async Task<IResult> Respond(
        AttemptResult result,
        AttemptService attempts,
        bool isMove,
        CancellationToken ct)
    {
        if (result.Error is not null)
            return ApiResults.Error(result.Error, result.Status);

        var dto = await attempts.ToResponse(result.Attempt!, ct);
        return isMove
            ? Results.Ok(new MoveResponse(result.Correct, result.Shielded, dto))
            : Results.Ok(dto);
    }

    private static IResult Unauthorized() =>
        ApiResults.Error(
            "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.",
            StatusCodes.Status401Unauthorized);
}
