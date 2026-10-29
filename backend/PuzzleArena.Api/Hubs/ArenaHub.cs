using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PuzzleArena.Api.Hubs;

/// <summary>
/// /hubs/arena. Client gọi Watch(id) hoặc Monitor(id); server gửi:
///   "stage"    : trạng thái mới của giải (Open, Qualifier, ...)
///   "progress" : bảng xếp hạng vòng hiện tại (tên, %, lỗi, thời gian), ai xem cũng được
///   "board"    : bàn chơi đầy đủ của một người chung kết, CHỈ admin
/// Khán giả không nhận bàn chơi: mọi người chơi chung một đề, công khai bàn là lộ đáp án.
/// </summary>
public sealed class ArenaHub : Hub
{
    public static string Public(int tournamentId) => $"t-{tournamentId}";
    public static string Monitors(int tournamentId) => $"t-{tournamentId}-monitor";

    public Task Watch(int tournamentId) => Groups.AddToGroupAsync(Context.ConnectionId, Public(tournamentId));

    [Authorize(Roles = "Admin")]
    public Task Monitor(int tournamentId) => Groups.AddToGroupAsync(Context.ConnectionId, Monitors(tournamentId));
}
