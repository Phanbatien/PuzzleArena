using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;

namespace PuzzleArena.Api.Tournaments;

/// <summary>
/// Giải đấu 2 vòng: vòng loại mở cho mọi người đã đăng ký (cùng đề, cùng giờ bắt đầu),
/// rồi chung kết cho top N nhanh nhất với một đề khác.
/// Lượt chơi trong giải đi qua <see cref="AttemptService"/> của BE2 như mọi lượt khác.
/// </summary>
public sealed class TournamentService(AppDb db, AttemptService attempts, IPuzzleGenerator generator)
{
    public Task<Tournament?> Load(int id, CancellationToken ct = default) => db.Tournaments
        .Include(t => t.Entries).ThenInclude(e => e.User)
        .Include(t => t.Puzzles).ThenInclude(p => p.Puzzle)
        .AsSplitQuery()
        .FirstOrDefaultAsync(t => t.Id == id, ct);

    /// <summary>
    /// Bảng xếp hạng một vòng, tính từ Attempt (không lưu bảng riêng):
    /// giải xong trước (nhanh hơn, rồi ít lỗi hơn), sau đó người chưa xong theo tiến độ, chưa vào thi xếp cuối.
    /// </summary>
    public static List<StandingResponse> Rank(IEnumerable<TournamentEntry> entries, IEnumerable<Attempt> stageAttempts)
    {
        var byUser = stageAttempts.GroupBy(a => a.UserId).ToDictionary(g => g.Key, g => g.OrderBy(a => a.Id).First());
        return entries
            .Select(e => (Entry: e, Attempt: byUser.GetValueOrDefault(e.UserId)))
            .OrderBy(x => x.Attempt is null ? 2 : x.Attempt.Status == AttemptStatus.Solved ? 0 : 1)
            .ThenBy(x => x.Attempt?.Status == AttemptStatus.Solved ? x.Attempt.DurationMs : 0)
            .ThenBy(x => x.Attempt?.Status == AttemptStatus.Solved ? x.Attempt.Mistakes : 0)
            .ThenByDescending(x => x.Attempt?.Progress ?? 0)
            .ThenBy(x => x.Attempt?.Mistakes ?? 0)
            .ThenBy(x => x.Entry.RegisteredAt)
            .Select((x, i) => new StandingResponse(
                i + 1,
                x.Entry.UserId,
                x.Entry.User.Username,
                x.Attempt?.Status.ToString() ?? "NotStarted",
                x.Attempt?.Progress ?? 0,
                x.Attempt?.Mistakes ?? 0,
                x.Attempt?.DurationMs,
                x.Entry.IsFinalist))
            .ToList();
    }

    public static TournamentPuzzle? StagePuzzle(Tournament t, TournamentStage stage) =>
        t.Puzzles.FirstOrDefault(p => p.Stage == stage);

    public static DateTimeOffset? StageEndsAt(Tournament t) => t.Status switch
    {
        TournamentStatus.Qualifier => t.QualifierStartedAt?.AddMinutes(t.RoundMinutes),
        TournamentStatus.Final => t.FinalStartedAt?.AddMinutes(t.RoundMinutes),
        _ => null,
    };

    /// <summary>Vòng đang hiển thị: chung kết khi đã bắt đầu chung kết, còn lại là vòng loại.</summary>
    public static TournamentStage CurrentStage(Tournament t) =>
        t.Status is TournamentStatus.Final or TournamentStatus.Closed ? TournamentStage.Final : TournamentStage.Qualifier;

    public async Task<List<StandingResponse>> Standings(Tournament t, TournamentStage stage, CancellationToken ct = default)
    {
        var entries = stage == TournamentStage.Final ? t.Entries.Where(e => e.IsFinalist) : t.Entries;
        // Trước khi vòng bắt đầu chưa có đề: ai cũng "NotStarted".
        if (StagePuzzle(t, stage) is not { } tp)
            return Rank(entries, []);

        var stageAttempts = await db.Attempts.AsNoTracking()
            .Where(a => a.TournamentId == t.Id && a.PuzzleId == tp.PuzzleId)
            .ToListAsync(ct);
        return Rank(entries, stageAttempts);
    }

    public async Task<TournamentDetailResponse?> Detail(int id, int? userId, CancellationToken ct = default)
    {
        if (await Load(id, ct) is not { } t)
            return null;

        var qualifier = await Standings(t, TournamentStage.Qualifier, ct);
        var final = await Standings(t, TournamentStage.Final, ct);
        var me = t.Entries.FirstOrDefault(e => e.UserId == userId);
        return new TournamentDetailResponse(
            t.Id, t.Name, t.GameType, t.Difficulty, t.Status, t.FinalistCount, t.RoundMinutes,
            t.Entries.Count,
            t.QualifierStartedAt, t.FinalStartedAt, StageEndsAt(t), DateTimeOffset.UtcNow,
            me is not null, me?.IsFinalist ?? false,
            CurrentStage(t) == TournamentStage.Final ? final : qualifier,
            qualifier, final);
    }

    public async Task<(Tournament? Tournament, string? Error)> Create(CreateTournamentRequest r, CancellationToken ct = default)
    {
        var name = r.Name?.Trim() ?? "";
        if (name.Length is < 3 or > 80) return (null, "Tên giải cần từ 3 đến 80 ký tự.");
        if (r.GameType is not { } game || !Enum.IsDefined(game)) return (null, "Loại game không hợp lệ.");
        if (r.Difficulty is not { } difficulty || !Enum.IsDefined(difficulty)) return (null, "Độ khó không hợp lệ.");
        var finalists = r.FinalistCount ?? 6;
        if (finalists is < 2 or > 10) return (null, "Số người vào chung kết từ 2 đến 10.");
        var minutes = r.RoundMinutes ?? 15;
        if (minutes is < 1 or > 120) return (null, "Thời gian mỗi vòng từ 1 đến 120 phút.");

        var t = new Tournament
        {
            Name = name,
            GameType = game,
            Difficulty = difficulty,
            FinalistCount = finalists,
            RoundMinutes = minutes,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.Tournaments.Add(t);
        await db.SaveChangesAsync(ct);
        return (t, null);
    }

    public async Task<(int Status, string? Error)> Register(int id, int userId, CancellationToken ct = default)
    {
        var t = await db.Tournaments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t is null) return (StatusCodes.Status404NotFound, "Không tìm thấy giải đấu.");
        if (t.Status != TournamentStatus.Open) return (StatusCodes.Status400BadRequest, "Giải đã đóng đăng ký.");

        if (!await db.TournamentEntries.AnyAsync(e => e.TournamentId == id && e.UserId == userId, ct))
        {
            db.TournamentEntries.Add(new TournamentEntry
            {
                TournamentId = id,
                UserId = userId,
                RegisteredAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync(ct);
        }
        return (StatusCodes.Status200OK, null);
    }

    /// <summary>
    /// Vào thi vòng hiện tại. Đồng hồ của mọi người tính từ lúc VÒNG bắt đầu, không phải lúc mở đề,
    /// và mỗi người chỉ có một lượt mỗi vòng (vào lại thì trả đúng lượt cũ).
    /// </summary>
    public async Task<AttemptResult> Play(int id, int userId, CancellationToken ct = default)
    {
        if (await Load(id, ct) is not { } t)
            return AttemptResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy giải đấu.");

        var entry = t.Entries.FirstOrDefault(e => e.UserId == userId);
        if (entry is null)
            return AttemptResult.Fail(StatusCodes.Status403Forbidden, "Bạn chưa đăng ký giải này.");

        var (stage, startedAt) = t.Status switch
        {
            TournamentStatus.Qualifier => (TournamentStage.Qualifier, t.QualifierStartedAt),
            TournamentStatus.Final when entry.IsFinalist => (TournamentStage.Final, t.FinalStartedAt),
            TournamentStatus.Final => (TournamentStage.Final, null),
            _ => (TournamentStage.Qualifier, (DateTimeOffset?)null),
        };
        if (startedAt is null || StagePuzzle(t, stage) is not { } tp)
            return AttemptResult.Fail(StatusCodes.Status400BadRequest, "Bạn không có lượt thi ở vòng này.");

        var existing = await db.Attempts.Include(a => a.Puzzle)
            .Where(a => a.UserId == userId && a.TournamentId == t.Id && a.PuzzleId == tp.PuzzleId)
            .OrderBy(a => a.Id)
            .FirstOrDefaultAsync(ct);
        if (existing is not null)
            return new AttemptResult(existing);

        var deadline = startedAt.Value.AddMinutes(t.RoundMinutes);
        if (DateTimeOffset.UtcNow >= deadline)
            return AttemptResult.Fail(StatusCodes.Status400BadRequest, "Vòng thi đã hết giờ.");

        var attempt = await attempts.Start(userId, tp.Puzzle, t.Id, deadline, ct);
        attempt.StartedAt = startedAt.Value;
        await db.SaveChangesAsync(ct);
        return new AttemptResult(attempt);
    }

    /// <summary>Chuyển giải sang bước tiếp theo. Trả về thông báo lỗi, hoặc null nếu thành công.</summary>
    // ponytail: admin bấm và đồng hồ tự chuyển có thể chạy cùng lúc; nếu cần chặt thì thêm concurrency token cho Status.
    public async Task<string?> Advance(Tournament t, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        switch (t.Status)
        {
            case TournamentStatus.Open:
                if (t.Entries.Count == 0) return "Chưa có người chơi nào đăng ký.";
                AddPuzzle(t, TournamentStage.Qualifier);
                t.QualifierStartedAt = now;
                t.Status = TournamentStatus.Qualifier;
                break;

            case TournamentStatus.Qualifier:
                var ranked = await CloseStage(t, TournamentStage.Qualifier, ct);
                var qualified = ranked
                    .Where(s => s.Status != "NotStarted")
                    .Take(t.FinalistCount)
                    .Select(s => s.UserId)
                    .ToHashSet();
                foreach (var e in t.Entries) e.IsFinalist = qualified.Contains(e.UserId);
                t.Status = TournamentStatus.QualifierDone;
                break;

            case TournamentStatus.QualifierDone:
                if (!t.Entries.Any(e => e.IsFinalist)) return "Không có ai vượt qua vòng loại.";
                AddPuzzle(t, TournamentStage.Final);
                t.FinalStartedAt = now;
                t.Status = TournamentStatus.Final;
                break;

            case TournamentStatus.Final:
                foreach (var s in await CloseStage(t, TournamentStage.Final, ct))
                    t.Entries.First(e => e.UserId == s.UserId).FinalRank = s.Rank;
                t.Status = TournamentStatus.Closed;
                break;

            default:
                return "Giải đấu đã kết thúc.";
        }

        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>Id các giải đang có vòng đã hết giờ (đồng hồ nền gọi để tự chuyển vòng).</summary>
    public async Task<List<int>> ExpiredRounds(CancellationToken ct = default)
    {
        var running = await db.Tournaments.AsNoTracking()
            .Where(t => t.Status == TournamentStatus.Qualifier || t.Status == TournamentStatus.Final)
            .ToListAsync(ct);
        var now = DateTimeOffset.UtcNow;
        return running.Where(t => StageEndsAt(t) <= now).Select(t => t.Id).ToList();
    }

    /// <summary>Bàn chơi của các người vào chung kết, cho màn hình ban tổ chức (chỉ admin).</summary>
    public async Task<List<MonitorRow>?> Monitor(int id, CancellationToken ct = default)
    {
        if (await Load(id, ct) is not { } t)
            return null;

        var puzzleId = StagePuzzle(t, TournamentStage.Final)?.PuzzleId;
        var live = puzzleId is null
            ? []
            : await db.Attempts.AsNoTracking().Include(a => a.Puzzle)
                .Where(a => a.TournamentId == t.Id && a.PuzzleId == puzzleId)
                .ToListAsync(ct);

        return t.Entries.Where(e => e.IsFinalist).OrderBy(e => e.User.Username)
            .Select(e => live.FirstOrDefault(a => a.UserId == e.UserId) is { } a
                ? ToMonitorRow(a, e.User.Username, live)
                : new MonitorRow(e.UserId, e.User.Username, 0, 0, AttemptStatus.InProgress, null, null))
            .ToList();
    }

    public static MonitorRow ToMonitorRow(Attempt a, string username, IEnumerable<Attempt> stageAttempts)
    {
        bool finished = a.Status != AttemptStatus.InProgress;
        int? finishRank = a.Status == AttemptStatus.Solved
            ? 1 + stageAttempts.Count(o => o.Status == AttemptStatus.Solved && o.Id != a.Id && o.DurationMs < a.DurationMs)
            : null;
        return new MonitorRow(a.UserId, username, a.Progress, a.Mistakes, a.Status, finishRank,
            GameEngine.View(a.Puzzle, a.State, finished));
    }

    // Đề của mỗi vòng chỉ sinh lúc vòng bắt đầu, nên không ai (kể cả admin) thấy đề trước.
    private void AddPuzzle(Tournament t, TournamentStage stage)
    {
        var puzzle = generator.Generate(t.GameType, t.Difficulty, Random.Shared.Next());
        puzzle.IsDaily = false;
        puzzle.DailyDate = null;
        t.Puzzles.Add(new TournamentPuzzle { Stage = stage, Puzzle = puzzle });
    }

    // Ai còn đang chơi thì kết thúc lượt (tính là thua), rồi xếp hạng vòng đó.
    private async Task<List<StandingResponse>> CloseStage(Tournament t, TournamentStage stage, CancellationToken ct)
    {
        var tp = StagePuzzle(t, stage)!;
        var playing = await db.Attempts
            .Where(a => a.TournamentId == t.Id && a.PuzzleId == tp.PuzzleId && a.Status == AttemptStatus.InProgress)
            .Select(a => new { a.Id, a.UserId })
            .ToListAsync(ct);
        foreach (var a in playing)
            await attempts.Abandon(a.UserId, a.Id, ct);

        return await Standings(t, stage, ct);
    }
}
