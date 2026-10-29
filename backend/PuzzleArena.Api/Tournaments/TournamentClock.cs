using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Tournaments;

/// <summary>Hết giờ vòng thì tự chuyển vòng, không cần admin bấm. Kiểm tra mỗi vài giây.</summary>
public sealed class TournamentClock(IServiceScopeFactory scopes, ILogger<TournamentClock> log) : BackgroundService
{
    private static readonly TimeSpan Every = TimeSpan.FromSeconds(5);

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
        var events = scope.ServiceProvider.GetRequiredService<TournamentEvents>();
        foreach (var id in await tournaments.ExpiredRounds(ct))
        {
            if (await tournaments.Load(id, ct) is not { } t) continue;
            if (await tournaments.Advance(t, ct) is null)
                await events.StageChanged(t.Id, t.Status, ct);
        }
    }
}
