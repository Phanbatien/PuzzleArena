using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Games;
using PuzzleArena.Api.Tournaments;

namespace PuzzleArena.Api.Endpoints;

public static class TournamentEndpoints
{
    public static void MapTournamentEndpoints(this WebApplication app)
    {
        var api = app.MapGroup("/api/tournaments");
        var admin = app.MapGroup("/api/tournaments")
            .RequireAuthorization(policy => policy.RequireRole(nameof(Role.Admin)));

        api.MapGet("", List);
        api.MapGet("/{id:int}", Detail);
        api.MapPost("/{id:int}/register", Register).RequireAuthorization();
        api.MapPost("/{id:int}/play", Play).RequireAuthorization();
        admin.MapPost("", Create);
        admin.MapPost("/{id:int}/advance", Advance);
        admin.MapGet("/{id:int}/monitor", Monitor);
    }

    private static async Task<IResult> List(AppDb db, CancellationToken ct)
    {
        var rows = await db.Tournaments.AsNoTracking()
            .OrderByDescending(t => t.Id)
            .Select(t => new TournamentListItem(
                t.Id, t.Name, t.GameType, t.Difficulty, t.Status, t.FinalistCount, t.RoundMinutes, t.Entries.Count))
            .ToListAsync(ct);
        return Results.Ok(rows);
    }

    // Công khai: khán giả xem được tên, tiến độ, thời gian; không bao giờ có bàn chơi.
    private static async Task<IResult> Detail(int id, HttpContext http, TournamentService tournaments, CancellationToken ct)
    {
        var detail = await tournaments.Detail(id, AuthEndpoints.CurrentUserId(http), ct);
        return detail is null ? NotFound() : Results.Ok(detail);
    }

    private static async Task<IResult> Create(
        CreateTournamentRequest request,
        TournamentService tournaments,
        CancellationToken ct)
    {
        var (t, error) = await tournaments.Create(request, ct);
        if (error is not null)
            return ApiResults.Error(error, StatusCodes.Status400BadRequest);

        return Results.Ok(new TournamentListItem(
            t!.Id, t.Name, t.GameType, t.Difficulty, t.Status, t.FinalistCount, t.RoundMinutes, 0));
    }

    private static async Task<IResult> Register(int id, HttpContext http, TournamentService tournaments, CancellationToken ct)
    {
        if (AuthEndpoints.CurrentUserId(http) is not { } userId) return Unauthorized();

        var (status, error) = await tournaments.Register(id, userId, ct);
        return error is null ? Results.Ok(new { registered = true }) : ApiResults.Error(error, status);
    }

    // Trả về lượt chơi giống /api/practice, FE chuyển sang /play/{id}.
    private static async Task<IResult> Play(
        int id,
        HttpContext http,
        TournamentService tournaments,
        AttemptService attempts,
        CancellationToken ct)
    {
        if (AuthEndpoints.CurrentUserId(http) is not { } userId) return Unauthorized();

        var result = await tournaments.Play(id, userId, ct);
        if (result.Error is not null)
            return ApiResults.Error(result.Error, result.Status);

        return Results.Ok(await attempts.ToResponse(result.Attempt!, ct));
    }

    private static async Task<IResult> Advance(
        int id,
        TournamentService tournaments,
        TournamentEvents events,
        CancellationToken ct)
    {
        if (await tournaments.Load(id, ct) is not { } t) return NotFound();

        if (await tournaments.Advance(t, ct) is { } error)
            return ApiResults.Error(error, StatusCodes.Status400BadRequest);

        await events.StageChanged(t.Id, t.Status, ct);
        return Results.Ok(new { status = t.Status });
    }

    // Màn hình chung kết: bàn chơi đầy đủ của từng người. Chỉ admin, vì bàn chơi lộ đề.
    private static async Task<IResult> Monitor(int id, TournamentService tournaments, CancellationToken ct)
    {
        var rows = await tournaments.Monitor(id, ct);
        return rows is null ? NotFound() : Results.Ok(rows);
    }

    private static IResult NotFound() =>
        ApiResults.Error("Không tìm thấy giải đấu.", StatusCodes.Status404NotFound);

    private static IResult Unauthorized() =>
        ApiResults.Error(
            "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.",
            StatusCodes.Status401Unauthorized);
}
