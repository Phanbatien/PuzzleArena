using Microsoft.AspNetCore.SignalR;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;
using PuzzleArena.Api.Hubs;

namespace PuzzleArena.Api.Tournaments;

/// <summary>
/// Gọi từ AttemptService của BE2 sau mỗi thay đổi của một lượt trong giải: phân thắng thua trận đấu,
/// rồi phát realtime. Khán giả không nhận bàn chơi qua đây (họ xem trễ qua GET /live); chỉ admin nhận "board".
/// </summary>
public sealed class TournamentEvents(
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
            // TournamentService cần AttemptService, AttemptService cần lớp này: lấy lúc chạy để tránh vòng phụ thuộc.
            var tournaments = services.GetRequiredService<TournamentService>();
            var decided = await tournaments.OnAttemptChanged(attempt, ct);
            if (await tournaments.Load(id, ct) is not { } t)
                return;

            if (attempt.PuzzleId == t.QualifierPuzzleId)
                await hub.Clients.Group(ArenaHub.Public(id))
                    .SendAsync("progress", await tournaments.QualifierStandings(t, ct), ct);

            var username = t.Entries.First(e => e.UserId == attempt.UserId).User.Username;
            var matchId = await tournaments.MatchIdOf(attempt, ct);
            await hub.Clients.Group(ArenaHub.Monitors(id))
                .SendAsync("board", TournamentService.ToMonitorRow(attempt, username, matchId, null), ct);

            if (decided)
                await Bracket(id, t.Status, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogWarning(ex, "Could not handle attempt {AttemptId} of tournament {TournamentId}.", attempt.Id, id);
        }
    }

    /// <summary>Nhánh đấu hoặc trạng thái giải đổi: FE tải lại GET /api/tournaments/{id}.</summary>
    public async Task Bracket(int tournamentId, TournamentStatus status, CancellationToken ct = default)
    {
        await hub.Clients.Group(ArenaHub.Public(tournamentId)).SendAsync("stage", status.ToString(), ct);
        await hub.Clients.Group(ArenaHub.Public(tournamentId)).SendAsync("bracket", tournamentId, ct);
    }
}
