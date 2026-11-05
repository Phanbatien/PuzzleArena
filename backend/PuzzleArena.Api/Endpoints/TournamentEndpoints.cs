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
        api.MapGet("/{id:int}/live", Live);
        api.MapPost("/{id:int}/register", Register).RequireAuthorization();
        api.MapPost("/{id:int}/play", Play).RequireAuthorization();
        admin.MapPost("", Create);
        admin.MapPost("/{id:int}/advance", Advance);
        admin.MapGet("/{id:int}/monitor", Monitor);
    }

    private static async Task<IResult> List(AppDb db, CancellationToken ct)
    {
        var rows = await db.Tournaments.AsNoTracking()
            .Select(t => new { t.Id, t.Name, t.GameType, t.Difficulty, t.Status, t.StartsAt, t.BracketSize, t.RoundMinutes, Count = t.Entries.Count })
            .ToListAsync(ct);
        // Sắp xếp sau khi tải: SQLite (chạy dev) không ORDER BY được DateTimeOffset.
        return Results.Ok(rows.OrderByDescending(t => t.StartsAt).Select(t => new TournamentListItem(
            t.Id, t.Name, t.GameType, t.Difficulty, t.Status, t.StartsAt, t.BracketSize, t.RoundMinutes, t.Count,
            Bracket.Summary(t.Count, t.BracketSize, t.RoundMinutes, t.Status))));
    }

    // Công khai: lịch, hình thức, nhánh đấu, bảng xếp hạng vòng loại. Không có bàn chơi.
    private static async Task<IResult> Detail(int id, HttpContext http, TournamentService tournaments, CancellationToken ct)
    {
        var detail = await tournaments.Detail(id, AuthEndpoints.CurrentUserId(http), ct);
        return detail is null ? NotFound() : Results.Ok(detail);
    }

    // Công khai: bàn chơi của các trận đang diễn ra, TRỄ SpectatorDelaySeconds giây. FE gọi lại mỗi vài giây.
    private static async Task<IResult> Live(int id, HttpContext http, TournamentService tournaments, CancellationToken ct)
    {
        var (live, error) = await tournaments.Live(id, AuthEndpoints.CurrentUserId(http), ct);
        if (error is not null) return ApiResults.Error(error, StatusCodes.Status403Forbidden);
        return live is null ? NotFound() : Results.Ok(live);
    }

    private static async Task<IResult> Create(CreateTournamentRequest request, TournamentService tournaments, CancellationToken ct)
    {
        var (t, error) = await tournaments.Create(request, ct);
        if (error is not null)
            return ApiResults.Error(error, StatusCodes.Status400BadRequest);

        return Results.Ok(new TournamentListItem(
            t!.Id, t.Name, t.GameType, t.Difficulty, t.Status, t.StartsAt, t.BracketSize, t.RoundMinutes, 0,
            TournamentService.FormatSummary(t)));
    }

    private static async Task<IResult> Register(int id, HttpContext http, TournamentService tournaments, CancellationToken ct)
    {
        if (AuthEndpoints.CurrentUserId(http) is not { } userId) return Unauthorized();

        var (status, error) = await tournaments.Register(id, userId, ct);
        return error is null ? Results.Ok(new { registered = true }) : ApiResults.Error(error, status);
    }

    // Vòng loại: trả lượt chơi. Nhánh đấu: lần gọi đầu là "vào phòng chờ" (202 khi đối thủ chưa vào);
    // đủ hai người thì trả lượt chơi có giờ bắt đầu chung (startedAt). FE chuyển sang /play/{id}.
    private static async Task<IResult> Play(
        int id,
        HttpContext http,
        TournamentService tournaments,
        AttemptService attempts,
        TournamentEvents events,
        CancellationToken ct)
    {
        if (AuthEndpoints.CurrentUserId(http) is not { } userId) return Unauthorized();

        var result = await tournaments.Play(id, userId, ct);
        if (result.Status is StatusCodes.Status202Accepted or StatusCodes.Status200OK && await tournaments.Load(id, ct) is { } t)
            await events.Bracket(t.Id, t.Status, ct); // trang của đối thủ cập nhật "đã vào phòng" / "trận bắt đầu"
        if (result.Status == StatusCodes.Status202Accepted)
            return Results.Json(new { waiting = true, message = result.Error }, statusCode: StatusCodes.Status202Accepted);
        if (result.Error is not null)
            return ApiResults.Error(result.Error, result.Status);

        return Results.Ok(await attempts.ToResponse(result.Attempt!, ct));
    }

    // Admin ép bước tiếp theo ngay: bắt đầu giải, đóng vòng loại, bắt đầu vòng đấu, hoặc phân thắng thua theo luật hết giờ.
    private static async Task<IResult> Advance(int id, TournamentService tournaments, TournamentEvents events, CancellationToken ct)
    {
        if (await tournaments.Load(id, ct) is not { } t) return NotFound();

        if (await tournaments.Advance(t, ct) is { } error)
            return ApiResults.Error(error, StatusCodes.Status400BadRequest);

        await events.Bracket(t.Id, t.Status, ct);
        return Results.Ok(new { status = t.Status, currentRound = t.CurrentRound });
    }

    // Màn hình ban tổ chức: bàn chơi thời gian thực. Chỉ admin, vì bàn chơi lộ đề.
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
