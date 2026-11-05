using PuzzleArena.Business.Tournaments;

namespace PuzzleArena.Api.Realtime;

/// <summary>
/// Giải chạy theo giờ, không cần admin bấm: tới giờ thì bắt đầu, hết giờ thì đóng vòng loại / phân thắng thua trận,
/// xong vòng thì nghỉ rồi vào vòng sau. Kiểm tra mỗi vài giây.
/// </summary>
public sealed class TournamentClock(IServiceScopeFactory scopes, ILogger<TournamentClock> log) : BackgroundService
{
    private static readonly TimeSpan Every = TimeSpan.FromSeconds(3);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Every);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await Tick(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogWarning(ex, "Tournament clock tick failed.");
            }
        }
    }

    private async Task Tick(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var tournaments = scope.ServiceProvider.GetRequiredService<TournamentService>();
        var notifier = scope.ServiceProvider.GetRequiredService<ITournamentNotifier>();
        foreach (var id in await tournaments.ActiveIds(ct))
        {
            if (await tournaments.Load(id, ct) is not { } t) continue;
            if (await tournaments.Tick(t, ct))
                await notifier.Bracket(t.Id, t.Status, ct);
        }
    }
}
