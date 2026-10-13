using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PuzzleArena.Api.Hubs;

/// <summary>
/// Server → client only. Events: "progress" (public numbers), "board" (monitor group, full boards), "stage".
/// Boards go to admins only: every player solves the same puzzle, so a public board would leak the answer.
/// </summary>
public class ArenaHub : Hub
{
    public static string Public(int tournamentId) => $"t-{tournamentId}";
    public static string Monitors(int tournamentId) => $"t-{tournamentId}-monitor";

    public Task Watch(int tournamentId) => Groups.AddToGroupAsync(Context.ConnectionId, Public(tournamentId));

    [Authorize(Roles = "Admin")]
    public Task Monitor(int tournamentId) => Groups.AddToGroupAsync(Context.ConnectionId, Monitors(tournamentId));
}
