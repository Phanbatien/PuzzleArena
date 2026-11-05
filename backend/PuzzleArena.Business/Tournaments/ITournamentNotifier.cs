using PuzzleArena.Business.Contracts;

namespace PuzzleArena.Business.Tournaments;

/// <summary>
/// Lớp Business cần "báo tin" (tiến độ, bàn chơi, nhánh đấu) nhưng không được biết SignalR là gì:
/// lớp Presentation cài đặt interface này bằng SignalR (Api/Realtime/SignalRTournamentNotifier).
/// </summary>
public interface ITournamentNotifier
{
    Task Progress(int tournamentId, List<StandingResponse> standings, CancellationToken ct = default);
    Task Board(int tournamentId, MonitorRow row, CancellationToken ct = default);
    Task Bracket(int tournamentId, TournamentStatus status, CancellationToken ct = default);
}
