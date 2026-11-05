using Microsoft.AspNetCore.SignalR;
using PuzzleArena.Api.Hubs;
using PuzzleArena.Business.Contracts;
using PuzzleArena.Business.Tournaments;
using PuzzleArena.DataAccess.Domain;

namespace PuzzleArena.Api.Realtime;

/// <summary>
/// Cài đặt ITournamentNotifier (lớp Business) bằng SignalR. Nhóm "t-{id}" là khán giả,
/// "t-{id}-monitor" chỉ admin (xem ArenaHub).
/// </summary>
public sealed class SignalRTournamentNotifier(IHubContext<ArenaHub> hub) : ITournamentNotifier
{
    public Task Progress(int tournamentId, List<StandingResponse> standings, CancellationToken ct = default) =>
        hub.Clients.Group(ArenaHub.Public(tournamentId)).SendAsync("progress", standings, ct);

    public Task Board(int tournamentId, MonitorRow row, CancellationToken ct = default) =>
        hub.Clients.Group(ArenaHub.Monitors(tournamentId)).SendAsync("board", row, ct);

    // Nhánh đấu hoặc trạng thái giải đổi: FE tải lại GET /api/tournaments/{id}.
    public async Task Bracket(int tournamentId, TournamentStatus status, CancellationToken ct = default)
    {
        await hub.Clients.Group(ArenaHub.Public(tournamentId)).SendAsync("stage", status.ToString(), ct);
        await hub.Clients.Group(ArenaHub.Public(tournamentId)).SendAsync("bracket", tournamentId, ct);
    }
}
