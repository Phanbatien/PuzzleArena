using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Games;
using PuzzleArena.Api.Services;

namespace PuzzleArena.Api.Endpoints;

public static class TournamentEndpoints
{
    public record CreateRequest(string Name, GameType Game, Difficulty Difficulty, int FinalistCount, int RoundMinutes);

    public static void MapTournaments(this WebApplication app)
    {
        var api = app.MapGroup("/api/tournaments");
        var admin = api.MapGroup("").RequireAuthorization(p => p.RequireRole(nameof(Role.Admin)));

        api.MapGet("", async (AppDb db) => await db.Tournaments.OrderByDescending(t => t.Id).Select(t => new
        {
            t.Id, t.Name, game = t.GameType, t.Difficulty, t.Status, t.FinalistCount, t.RoundMinutes, players = t.Entries.Count,
        }).ToListAsync());

        admin.MapPost("", async (CreateRequest r, ClaimsPrincipal p, AppDb db) =>
        {
            var name = r.Name?.Trim() ?? "";
            if (name.Length is < 3 or > 80) return Results.BadRequest(new { error = "Tên giải cần 3–80 ký tự." });
            if (!Enum.IsDefined(r.Game) || !Enum.IsDefined(r.Difficulty)) return Results.BadRequest(new { error = "Game hoặc độ khó không hợp lệ." });
            if (r.FinalistCount is < 2 or > 10) return Results.BadRequest(new { error = "Số người vào chung kết từ 2 đến 10." });
            if (r.RoundMinutes is < 1 or > 120) return Results.BadRequest(new { error = "Thời gian mỗi vòng từ 1 đến 120 phút." });

            var t = new Tournament
            {
                Name = name, GameType = r.Game, Difficulty = r.Difficulty,
                FinalistCount = r.FinalistCount, RoundMinutes = r.RoundMinutes, CreatedBy = p.Id(),
            };
            db.Tournaments.Add(t);
            await db.SaveChangesAsync();
            return Results.Ok(new { t.Id });
        });

        // Public: spectators get names, progress and times — never a board.
        api.MapGet("/{id:int}", async (int id, ClaimsPrincipal p, AppDb db, TournamentService tournaments) =>
        {
            if (await tournaments.LoadAsync(id) is not { } t) return Results.NotFound();
            // ponytail: loads every attempt of the tournament per request. Fine for a class-sized qualifier;
            // project to the ranked columns and page the list when qualifiers reach thousands of players.
            var all = await db.Attempts.AsNoTracking().Where(a => a.TournamentId == id).ToListAsync();
            // Before a round starts there is no puzzle yet, so everyone is listed as not started
            // (the registration list while the tournament is open, the finalists while they wait).
            List<Standing> Board(Stage stage, IEnumerable<TournamentEntry> entries) =>
                TournamentService.Rank(entries, TournamentService.StagePuzzle(t, stage) is { } tp
                    ? all.Where(a => a.PuzzleId == tp.PuzzleId)
                    : []);

            var me = t.Entries.FirstOrDefault(e => e.UserId == p.IdOrNull());
            var stageStart = t.Status == TournamentStatus.Final ? t.FinalStartedAt
                : t.Status == TournamentStatus.Qualifier ? t.QualifierStartedAt : null;
            return Results.Ok(new
            {
                t.Id, t.Name, game = t.GameType, t.Difficulty, t.Status, t.FinalistCount, t.RoundMinutes,
                players = t.Entries.Count,
                registered = me is not null,
                isFinalist = me?.IsFinalist ?? false,
                stageEndsAt = stageStart?.AddMinutes(t.RoundMinutes),
                now = DateTime.UtcNow,
                qualifier = Board(Stage.Qualifier, t.Entries),
                final = Board(Stage.Final, t.Entries.Where(e => e.IsFinalist)),
            });
        });

        api.MapPost("/{id:int}/register", async (int id, ClaimsPrincipal p, AppDb db) =>
        {
            var t = await db.Tournaments.FindAsync(id);
            if (t is null) return Results.NotFound();
            if (t.Status != TournamentStatus.Open) return Results.BadRequest(new { error = "Giải đã đóng đăng ký." });
            var userId = p.Id();
            if (!await db.TournamentEntries.AnyAsync(e => e.TournamentId == id && e.UserId == userId))
            {
                db.TournamentEntries.Add(new TournamentEntry { TournamentId = id, UserId = userId });
                await db.SaveChangesAsync();
            }
            return Results.Ok();
        }).RequireAuthorization();

        // Everyone's clock starts when the round starts, not when they open the puzzle.
        api.MapPost("/{id:int}/play", async (int id, ClaimsPrincipal p, TournamentService tournaments, AttemptService attempts) =>
        {
            if (await tournaments.LoadAsync(id) is not { } t) return Results.NotFound();
            var entry = t.Entries.FirstOrDefault(e => e.UserId == p.Id());
            var (stage, start) = t.Status switch
            {
                TournamentStatus.Qualifier when entry is not null => (Stage.Qualifier, t.QualifierStartedAt),
                TournamentStatus.Final when entry is { IsFinalist: true } => (Stage.Final, t.FinalStartedAt),
                _ => (Stage.Qualifier, (DateTime?)null),
            };
            if (start is null) return Results.BadRequest(new { error = "Bạn không có lượt thi ở vòng này." });

            var deadline = start.Value.AddMinutes(t.RoundMinutes);
            var puzzle = TournamentService.StagePuzzle(t, stage)!.Puzzle;
            var attempt = await attempts.StartAsync(entry!.UserId, puzzle, t.Id, start, deadline);
            return Results.Ok(AttemptService.View(attempt));
        }).RequireAuthorization();

        admin.MapPost("/{id:int}/advance", async (int id, TournamentService tournaments) =>
        {
            if (await tournaments.LoadAsync(id) is not { } t) return Results.NotFound();
            return await tournaments.AdvanceAsync(t) is { } error ? Results.BadRequest(new { error }) : Results.Ok(new { t.Status });
        });

        // The projector screen: every finalist's live board. Admin only, because the boards reveal the puzzle.
        admin.MapGet("/{id:int}/monitor", async (int id, AppDb db, TournamentService tournaments) =>
        {
            if (await tournaments.LoadAsync(id) is not { } t) return Results.NotFound();
            var puzzleId = TournamentService.StagePuzzle(t, Stage.Final)?.PuzzleId;
            var live = await db.Attempts.AsNoTracking().Include(a => a.Puzzle).Include(a => a.User)
                .Where(a => a.PuzzleId == puzzleId).ToDictionaryAsync(a => a.UserId);
            return Results.Ok(t.Entries.Where(e => e.IsFinalist).OrderBy(e => e.User.Username).Select(e =>
            {
                var a = live.GetValueOrDefault(e.UserId);
                return new
                {
                    progress = a is null
                        ? new ProgressView(e.UserId, e.User.Username, puzzleId ?? 0, AttemptStatus.InProgress, 0, 0, null)
                        : AttemptService.Progress(a),
                    board = a is null ? null : GameEngine.View(a.Puzzle, a.State, a.Status != AttemptStatus.InProgress),
                };
            }));
        });
    }
}
