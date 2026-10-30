using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;
using PuzzleArena.Api.Hubs;

namespace PuzzleArena.Api.Tournaments;

/// <summary>Phát realtime sau mỗi thay đổi của một lượt trong giải đấu (gọi từ AttemptService của BE2).</summary>
public sealed class TournamentEvents(
    AppDb db,
    IHubContext<ArenaHub> hub,
    IServiceProvider services,
    ILogger<TournamentEvents> log) : IAttemptEvents
{
    // Nước đi đã được lưu trước khi gọi tới đây: phát realtime lỗi thì chỉ ghi log, không làm hỏng response của người chơi.
    public async Task Changed(Attempt attempt, CancellationToken ct = default)
    {
        if (attempt.TournamentId is not { } id)
            return;

        try
        {
            await Broadcast(attempt, id, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogWarning(ex, "Could not broadcast attempt {AttemptId} of tournament {TournamentId}.", attempt.Id, id);
        }
    }

    private async Task Broadcast(Attempt attempt, int id, CancellationToken ct)
    {

        // TournamentService cần AttemptService, AttemptService cần lớp này: lấy lúc chạy để tránh vòng phụ thuộc.
        var tournaments = services.GetRequiredService<TournamentService>();
        if (await tournaments.Load(id, ct) is not { } t)
            return;

        var stage = t.Puzzles.FirstOrDefault(p => p.PuzzleId == attempt.PuzzleId)?.Stage;
        if (stage is null)
            return;

        await hub.Clients.Group(ArenaHub.Public(id))
            .SendAsync("progress", await tournaments.Standings(t, stage.Value, ct), ct);

        if (stage != TournamentStage.Final)
            return;

        var finalAttempts = await db.Attempts.AsNoTracking()
            .Where(a => a.TournamentId == id && a.PuzzleId == attempt.PuzzleId)
            .ToListAsync(ct);
        var username = t.Entries.First(e => e.UserId == attempt.UserId).User.Username;
        await hub.Clients.Group(ArenaHub.Monitors(id))
            .SendAsync("board", TournamentService.ToMonitorRow(attempt, username, finalAttempts), ct);
    }

    public Task StageChanged(int tournamentId, TournamentStatus status, CancellationToken ct = default) =>
        hub.Clients.Group(ArenaHub.Public(tournamentId)).SendAsync("stage", status.ToString(), ct);
}
