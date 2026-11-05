using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Api.Tournaments;

/// <summary>
/// Giải đấu loại trực tiếp 1-1, theo cách các giải chuyên nghiệp (tennis, cờ vua, esports) hay làm:
///   - Admin đặt giờ bắt đầu; đăng ký đóng lúc đó.
///   - Số người &lt;= BracketSize: vào thẳng nhánh đấu, hạt giống theo điểm hạng, hạt giống cao được miễn vòng 1 nếu lẻ.
///   - Đông hơn: vòng loại mở (mọi người cùng một đề, cùng giờ), top BracketSize vào nhánh, hạt giống theo hạng vòng loại.
///   - Mỗi trận: hai người cùng một đề (mỗi trận một đề riêng). Giải xong trước thắng; sai quá số lỗi / trúng mìn / bỏ cuộc
///     là thua; hết giờ thì tiến độ cao hơn thắng (rồi ít lỗi hơn, rồi hạt giống cao hơn).
///   - Các vòng chạy theo giờ: mọi trận của một vòng bắt đầu cùng lúc; xong vòng thì nghỉ RoundBreak rồi vào vòng sau.
/// Lượt chơi đi qua <see cref="AttemptService"/> của BE2 như mọi lượt khác. <see cref="Tick"/> là máy trạng thái:
/// đồng hồ nền gọi nó mỗi vài giây, admin "chuyển vòng" thì ép nó đi tiếp ngay.
/// </summary>
public sealed class TournamentService(AppDb db, AttemptService attempts, IPuzzleGenerator generator, IConfiguration config)
{
    public int SpectatorDelaySeconds => config.GetValue("Tournaments:SpectatorDelaySeconds", 30);
    private TimeSpan RoundBreak => TimeSpan.FromSeconds(config.GetValue("Tournaments:RoundBreakSeconds", 30));
    // Phòng chờ: vòng bắt đầu thì mỗi trận chờ hai người bấm "Vào thi"; quá ReadyWindow mà chưa đủ thì xử vắng mặt.
    private TimeSpan ReadyWindow => TimeSpan.FromSeconds(config.GetValue("Tournaments:ReadySeconds", 120));
    // Đủ hai người thì đếm ngược rồi bắt đầu cùng một giờ cho cả hai.
    private TimeSpan Countdown => TimeSpan.FromSeconds(config.GetValue("Tournaments:CountdownSeconds", 5));

    public Task<Tournament?> Load(int id, CancellationToken ct = default) => db.Tournaments
        .Include(t => t.Entries).ThenInclude(e => e.User)
        .Include(t => t.Matches).ThenInclude(m => m.Player1)
        .Include(t => t.Matches).ThenInclude(m => m.Player2)
        .Include(t => t.QualifierPuzzle)
        .AsSplitQuery()
        .FirstOrDefaultAsync(t => t.Id == id, ct);

    // ---- tạo, đăng ký ----------------------------------------------------------

    public async Task<(Tournament? Tournament, string? Error)> Create(CreateTournamentRequest r, CancellationToken ct = default)
    {
        var name = r.Name?.Trim() ?? "";
        if (name.Length is < 3 or > 80) return (null, "Tên giải cần từ 3 đến 80 ký tự.");
        if (r.GameType is not { } game || !Enum.IsDefined(game)) return (null, "Loại game không hợp lệ.");
        if (r.Difficulty is not { } difficulty || !Enum.IsDefined(difficulty)) return (null, "Độ khó không hợp lệ.");
        var now = DateTimeOffset.UtcNow;
        if (r.StartsAt is not { } startsAt) return (null, "Cần chọn giờ bắt đầu.");
        if (startsAt < now.AddMinutes(-5) || startsAt > now.AddDays(60)) return (null, "Giờ bắt đầu phải từ bây giờ tới 60 ngày tới.");
        var bracketSize = r.BracketSize ?? 16;
        if (!Bracket.Sizes.Contains(bracketSize)) return (null, "Số suất nhánh đấu phải là 4, 8, 16 hoặc 32.");
        var minutes = r.RoundMinutes ?? 10;
        if (minutes is < 1 or > 60) return (null, "Thời gian mỗi trận từ 1 đến 60 phút.");
        var description = r.Description?.Trim() ?? "";
        if (description.Length > 1000) return (null, "Mô tả tối đa 1000 ký tự.");

        var t = new Tournament
        {
            Name = name,
            Description = description,
            GameType = game,
            Difficulty = difficulty,
            StartsAt = startsAt.ToUniversalTime(),
            BracketSize = bracketSize,
            RoundMinutes = minutes,
            CreatedAt = now,
        };
        db.Tournaments.Add(t);
        await db.SaveChangesAsync(ct);
        return (t, null);
    }

    public async Task<(int Status, string? Error)> Register(int id, int userId, CancellationToken ct = default)
    {
        var t = await db.Tournaments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t is null) return (StatusCodes.Status404NotFound, "Không tìm thấy giải đấu.");
        if (t.Status != TournamentStatus.Open || DateTimeOffset.UtcNow >= t.StartsAt)
            return (StatusCodes.Status400BadRequest, "Giải đã đóng đăng ký.");

        if (!await db.TournamentEntries.AnyAsync(e => e.TournamentId == id && e.UserId == userId, ct))
        {
            db.TournamentEntries.Add(new TournamentEntry { TournamentId = id, UserId = userId, RegisteredAt = DateTimeOffset.UtcNow });
            await db.SaveChangesAsync(ct);
        }
        return (StatusCodes.Status200OK, null);
    }

    // ---- máy trạng thái ----------------------------------------------------------

    /// <summary>Đi tiếp mọi bước đã tới giờ. Trả về true nếu có gì thay đổi (để phát realtime).</summary>
    public async Task<bool> Tick(Tournament t, CancellationToken ct = default)
    {
        var changed = false;
        for (var guard = 0; guard < 10; guard++) // một lần gọi có thể đi qua nhiều bước (vd. vòng chỉ có trận miễn đấu)
        {
            var step = await Step(t, DateTimeOffset.UtcNow, force: false, ct);
            if (!step) break;
            changed = true;
        }
        return changed;
    }

    /// <summary>Admin bấm "chuyển vòng": làm bước tiếp theo ngay, không chờ giờ. Trả về lỗi hoặc null.</summary>
    public async Task<string?> Advance(Tournament t, CancellationToken ct = default)
    {
        if (t.Status == TournamentStatus.Closed) return "Giải đấu đã kết thúc.";
        if (t.Status == TournamentStatus.Open && t.Entries.Count < 2) return "Cần ít nhất 2 người đăng ký.";
        await Step(t, DateTimeOffset.UtcNow, force: true, ct);
        await Tick(t, ct);
        return null;
    }

    private async Task<bool> Step(Tournament t, DateTimeOffset now, bool force, CancellationToken ct)
    {
        switch (t.Status)
        {
            case TournamentStatus.Open when force || now >= t.StartsAt:
                await Start(t, now, ct);
                return true;

            case TournamentStatus.Qualifier:
                // Hết giờ, hoặc mọi người đăng ký đều đã làm xong: đóng sớm, không bắt cả giải chờ.
                if (!force && now < t.QualifierStartedAt!.Value.AddMinutes(t.RoundMinutes) && !await EveryoneFinishedQualifier(t, ct))
                    return false;
                await CloseQualifier(t, now, ct);
                return true;

            case TournamentStatus.Knockout:
                var round = t.Matches.Where(m => m.Round == t.CurrentRound).ToList();
                if (round.Any(m => m.Status == MatchStatus.Pending) && (force || now >= t.RoundStartsAt))
                {
                    await StartRound(t, round, now, ct);
                    return true;
                }
                var noShow = round.Where(m => m.Status == MatchStatus.Live && m.StartedAt is null
                    && (force || now >= t.RoundStartsAt!.Value + ReadyWindow)).ToList();
                foreach (var m in noShow)
                    await DecideNoShow(t, m, now, ct);
                var expired = round.Where(m => m.Status == MatchStatus.Live && m.StartedAt is { } s
                    && (force || now >= s.AddMinutes(t.RoundMinutes))).ToList();
                foreach (var m in expired)
                    await DecideOnTime(t, m, now, ct);
                if (noShow.Count + expired.Count > 0) return true;
                if (round.All(m => m.Status == MatchStatus.Done))
                {
                    await FinishRound(t, now, ct);
                    return true;
                }
                return false;

            default:
                return false;
        }
    }

    private async Task Start(Tournament t, DateTimeOffset now, CancellationToken ct)
    {
        var n = t.Entries.Count;
        if (n < 2)
        {
            t.Status = TournamentStatus.Closed;
            t.ClosedNote = "Giải bị hủy: không đủ người đăng ký (cần ít nhất 2).";
        }
        else if (n > t.BracketSize)
        {
            var puzzle = generator.Generate(t.GameType, t.Difficulty, Random.Shared.Next());
            t.QualifierPuzzle = puzzle;
            t.QualifierStartedAt = now;
            t.Status = TournamentStatus.Qualifier;
        }
        else
        {
            // Hạt giống theo điểm hạng của game này (người mới = Elo.Initial), bằng điểm thì ai đăng ký trước đứng trên.
            var userIds = t.Entries.Select(e => e.UserId).ToList();
            var ratings = await db.UserRatings.AsNoTracking()
                .Where(r => r.GameType == t.GameType && userIds.Contains(r.UserId))
                .ToDictionaryAsync(r => r.UserId, r => r.Value, ct);
            var seeded = t.Entries
                .OrderByDescending(e => ratings.GetValueOrDefault(e.UserId, Elo.Initial))
                .ThenBy(e => e.RegisteredAt)
                .Select(e => e.UserId)
                .ToList();
            BuildBracket(t, seeded, now);
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task<bool> EveryoneFinishedQualifier(Tournament t, CancellationToken ct)
    {
        var done = (await QualifierAttempts(t, ct)).Where(a => a.Status != AttemptStatus.InProgress).Select(a => a.UserId).ToHashSet();
        return t.Entries.All(e => done.Contains(e.UserId));
    }

    private async Task CloseQualifier(Tournament t, DateTimeOffset now, CancellationToken ct)
    {
        foreach (var a in await QualifierAttempts(t, ct))
            if (a.Status == AttemptStatus.InProgress)
                await attempts.Abandon(a.UserId, a.Id, ct);

        var standings = Rank(t.Entries, await QualifierAttempts(t, ct));
        foreach (var s in standings)
            t.Entries.First(e => e.UserId == s.UserId).QualifierRank = s.Rank;

        var qualified = standings.Where(s => s.Status != "NotStarted").Take(t.BracketSize).Select(s => s.UserId).ToList();
        if (qualified.Count < 2)
        {
            t.Status = TournamentStatus.Closed;
            t.ClosedNote = "Giải kết thúc: không đủ người hoàn thành vòng loại để lập nhánh đấu.";
        }
        else
        {
            BuildBracket(t, qualified, now + RoundBreak);
        }
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Lập toàn bộ nhánh đấu: vòng 1 có người (suất miễn đấu thắng luôn), các vòng sau để trống chờ người thắng.</summary>
    private static void BuildBracket(Tournament t, List<int> seededUserIds, DateTimeOffset firstRoundAt)
    {
        var size = Bracket.NextPowerOfTwo(seededUserIds.Count);
        var rounds = Bracket.RoundCount(seededUserIds.Count);
        for (var i = 0; i < seededUserIds.Count; i++)
            t.Entries.First(e => e.UserId == seededUserIds[i]).Seed = i + 1;

        var order = Bracket.SeedOrder(size);
        int? Player(int seed) => seed <= seededUserIds.Count ? seededUserIds[seed - 1] : null;
        for (var slot = 0; slot < size / 2; slot++)
        {
            int s1 = order[slot * 2], s2 = order[slot * 2 + 1];
            var m = new TournamentMatch
            {
                Round = 1, Slot = slot,
                Player1Id = Player(s1), Seed1 = s1,
                Player2Id = Player(s2), Seed2 = Player(s2) is null ? null : s2,
            };
            if (m.Player2Id is null)
            {
                m.Status = MatchStatus.Done;
                m.WinnerId = m.Player1Id;
                m.Note = "Miễn đấu vòng 1 (hạt giống cao)";
            }
            t.Matches.Add(m);
        }
        for (var r = 2; r <= rounds; r++)
            for (var slot = 0; slot < size >> r; slot++)
                t.Matches.Add(new TournamentMatch { Round = r, Slot = slot });

        foreach (var bye in t.Matches.Where(m => m.Round == 1 && m.Status == MatchStatus.Done).ToList())
            MoveWinnerOn(t, bye);

        t.Status = TournamentStatus.Knockout;
        t.RoundCount = rounds;
        t.CurrentRound = 1;
        t.RoundStartsAt = firstRoundAt;
    }

    // Vòng bắt đầu: mở phòng chờ cho mọi trận. Trận chỉ thật sự bắt đầu khi CẢ HAI đã vào (xem Play / BeginMatch).
    private async Task StartRound(Tournament t, List<TournamentMatch> round, DateTimeOffset now, CancellationToken ct)
    {
        foreach (var m in round.Where(m => m.Status == MatchStatus.Pending))
            m.Status = MatchStatus.Live;
        t.RoundStartsAt = now;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Cả hai đã vào phòng: sinh đề (chỉ lúc này, nên không ai thấy đề trước), tạo lượt cho hai người với CÙNG một giờ
    /// bắt đầu = bây giờ + Countdown. Trước giờ đó AttemptService che bàn chơi và không nhận nước đi.
    /// </summary>
    private async Task BeginMatch(Tournament t, TournamentMatch m, DateTimeOffset now, CancellationToken ct)
    {
        var start = now + Countdown;
        var deadline = start.AddMinutes(t.RoundMinutes);
        var puzzle = generator.Generate(t.GameType, t.Difficulty, Random.Shared.Next());
        var a1 = await attempts.Start(m.Player1Id!.Value, puzzle, t.Id, deadline, ct);
        var a2 = await attempts.Start(m.Player2Id!.Value, puzzle, t.Id, deadline, ct);
        a1.StartedAt = start;
        a2.StartedAt = start;
        m.Puzzle = puzzle;
        m.PuzzleId = puzzle.Id;
        m.Attempt1Id = a1.Id;
        m.Attempt2Id = a2.Id;
        m.StartedAt = start;
        await db.SaveChangesAsync(ct);
    }

    // Hết giờ vào phòng: ai đã vào thì thắng; cả hai vắng thì hạt giống cao hơn đi tiếp.
    private Task DecideNoShow(Tournament t, TournamentMatch m, DateTimeOffset now, CancellationToken ct)
    {
        bool ready1 = m.Ready1At is not null, ready2 = m.Ready2At is not null;
        var (winner, note) = ready1 == ready2
            ? (m.Seed1 <= m.Seed2 ? m.Player1Id : m.Player2Id, "Cả hai không vào trận: hạt giống cao hơn đi tiếp")
            : (ready1 ? m.Player1Id : m.Player2Id, "Đối thủ không vào trận");
        return Complete(t, m, winner!.Value, note, now, ct);
    }

    /// <summary>
    /// Gọi sau mỗi thay đổi của một lượt trong giải (qua IAttemptEvents). Giải xong -> thắng; thua (sai quá số lỗi,
    /// trúng mìn, bỏ cuộc) -> đối thủ thắng. Trả về true nếu trận đã có kết quả.
    /// </summary>
    public async Task<bool> OnAttemptChanged(Attempt a, CancellationToken ct = default)
    {
        if (a.TournamentId is not { } id || a.Status == AttemptStatus.InProgress)
            return false;
        var match = await db.TournamentMatches
            .FirstOrDefaultAsync(m => m.TournamentId == id && m.Status == MatchStatus.Live
                && (m.Attempt1Id == a.Id || m.Attempt2Id == a.Id), ct);
        if (match is null)
            return false;
        if (await Load(id, ct) is not { } t)
            return false;
        match = t.Matches.First(m => m.Id == match.Id);

        var isFirst = match.Attempt1Id == a.Id;
        var me = isFirst ? match.Player1Id!.Value : match.Player2Id!.Value;
        var opponent = isFirst ? match.Player2Id!.Value : match.Player1Id!.Value;
        if (a.Status == AttemptStatus.Solved)
        {
            await Complete(t, match, me, "Giải xong trước", DateTimeOffset.UtcNow, ct);
            await EndAttempt(isFirst ? match.Attempt2Id : match.Attempt1Id, ct); // người thua dừng lại
        }
        else
        {
            var why = a.Mistakes >= GameEngine.MaxMistakes(t.GameType)
                ? (t.GameType == GameType.Minesweeper ? "Đối thủ trúng mìn" : "Đối thủ sai quá số lỗi cho phép")
                : "Đối thủ bỏ cuộc";
            // Người thắng được giữ nguyên lượt (không bị đánh dấu thua); lượt đó tự hết hạn theo deadline.
            await Complete(t, match, opponent, why, DateTimeOffset.UtcNow, ct);
        }
        await Tick(t, ct); // xong vòng thì lên lịch vòng sau ngay, không chờ đồng hồ
        return true;
    }

    private async Task DecideOnTime(Tournament t, TournamentMatch m, DateTimeOffset now, CancellationToken ct)
    {
        var a1 = await db.Attempts.FirstAsync(a => a.Id == m.Attempt1Id, ct);
        var a2 = await db.Attempts.FirstAsync(a => a.Id == m.Attempt2Id, ct);
        var (firstWins, note) = Bracket.DecideOnTime(a1, m.Seed1!.Value, a2, m.Seed2!.Value);
        await Complete(t, m, firstWins ? m.Player1Id!.Value : m.Player2Id!.Value, note, now, ct);
        await EndAttempt(m.Attempt1Id, ct);
        await EndAttempt(m.Attempt2Id, ct);
    }

    // Lưu kết quả TRƯỚC khi kết thúc lượt của người thua: kết thúc lượt lại gọi OnAttemptChanged, lúc đó trận đã Done.
    private async Task Complete(Tournament t, TournamentMatch m, int winnerId, string note, DateTimeOffset now, CancellationToken ct)
    {
        m.Status = MatchStatus.Done;
        m.WinnerId = winnerId;
        m.Note = note;
        m.FinishedAt = now;
        var loser = m.Player1Id == winnerId ? m.Player2Id : m.Player1Id;
        if (loser is { } l)
            t.Entries.First(e => e.UserId == l).EliminatedInRound = m.Round;
        MoveWinnerOn(t, m);
        await db.SaveChangesAsync(ct);
    }

    private async Task EndAttempt(int? attemptId, CancellationToken ct)
    {
        if (attemptId is not { } id) return;
        var a = await db.Attempts.FirstAsync(x => x.Id == id, ct);
        if (a.Status == AttemptStatus.InProgress)
            await attempts.Abandon(a.UserId, a.Id, ct);
    }

    private static void MoveWinnerOn(Tournament t, TournamentMatch m)
    {
        var next = t.Matches.FirstOrDefault(x => x.Round == m.Round + 1 && x.Slot == m.Slot / 2);
        if (next is null) return;
        var seed = m.WinnerId == m.Player1Id ? m.Seed1 : m.Seed2;
        if (m.Slot % 2 == 0) { next.Player1Id = m.WinnerId; next.Seed1 = seed; }
        else { next.Player2Id = m.WinnerId; next.Seed2 = seed; }
    }

    private async Task FinishRound(Tournament t, DateTimeOffset now, CancellationToken ct)
    {
        if (t.CurrentRound < t.RoundCount)
        {
            t.CurrentRound++;
            t.RoundStartsAt = now + RoundBreak;
        }
        else
        {
            var final = t.Matches.Single(m => m.Round == t.RoundCount);
            foreach (var e in t.Entries.Where(e => e.Seed is not null))
                e.FinalRank = e.UserId == final.WinnerId ? 1
                    : e.EliminatedInRound is { } r ? Bracket.RankWhenEliminated(r, t.RoundCount) : null;
            t.Status = TournamentStatus.Closed;
        }
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Id các giải cần đồng hồ nền xem xét (đang chạy, hoặc đã tới giờ bắt đầu).</summary>
    public async Task<List<int>> ActiveIds(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var candidates = await db.Tournaments.AsNoTracking()
            .Where(t => t.Status != TournamentStatus.Closed)
            .Select(t => new { t.Id, t.Status, t.StartsAt })
            .ToListAsync(ct);
        // So giờ sau khi tải: SQLite (chạy dev) không so sánh được DateTimeOffset trong câu truy vấn.
        return candidates.Where(t => t.Status != TournamentStatus.Open || t.StartsAt <= now).Select(t => t.Id).ToList();
    }

    // ---- vào thi ----------------------------------------------------------

    /// <summary>Vòng loại: tạo lượt (đồng hồ tính từ lúc vòng bắt đầu). Nhánh đấu: trả lượt của trận mình đang đấu.</summary>
    public async Task<AttemptResult> Play(int id, int userId, CancellationToken ct = default)
    {
        if (await Load(id, ct) is not { } t)
            return AttemptResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy giải đấu.");
        var entry = t.Entries.FirstOrDefault(e => e.UserId == userId);
        if (entry is null)
            return AttemptResult.Fail(StatusCodes.Status403Forbidden, "Bạn chưa đăng ký giải này.");

        if (t.Status == TournamentStatus.Qualifier)
        {
            var existing = await db.Attempts.Include(a => a.Puzzle)
                .Where(a => a.UserId == userId && a.TournamentId == t.Id && a.PuzzleId == t.QualifierPuzzleId)
                .OrderBy(a => a.Id).FirstOrDefaultAsync(ct);
            if (existing is not null) return new AttemptResult(existing);

            var started = t.QualifierStartedAt!.Value;
            var deadline = started.AddMinutes(t.RoundMinutes);
            if (DateTimeOffset.UtcNow >= deadline)
                return AttemptResult.Fail(StatusCodes.Status400BadRequest, "Vòng loại đã hết giờ.");
            var attempt = await attempts.Start(userId, t.QualifierPuzzle!, t.Id, deadline, ct);
            attempt.StartedAt = started; // đồng hồ mọi người tính từ lúc vòng bắt đầu
            await db.SaveChangesAsync(ct);
            return new AttemptResult(attempt);
        }

        if (t.Status == TournamentStatus.Knockout)
        {
            var m = t.Matches.FirstOrDefault(x => x.Round == t.CurrentRound && (x.Player1Id == userId || x.Player2Id == userId));
            if (m is { Status: MatchStatus.Live })
            {
                if (m.StartedAt is null)
                {
                    var now = DateTimeOffset.UtcNow;
                    if (m.Player1Id == userId) m.Ready1At ??= now;
                    else m.Ready2At ??= now;
                    if (m.Ready1At is null || m.Ready2At is null)
                    {
                        await db.SaveChangesAsync(ct);
                        // 202: đã vào phòng chờ, FE gọi lại cho tới khi đối thủ vào và trận có giờ bắt đầu.
                        return AttemptResult.Fail(StatusCodes.Status202Accepted, "Bạn đã vào phòng. Đang chờ đối thủ...");
                    }
                    await BeginMatch(t, m, now, ct);
                }
                var attemptId = m.Player1Id == userId ? m.Attempt1Id : m.Attempt2Id;
                var attempt = await db.Attempts.Include(a => a.Puzzle).FirstAsync(a => a.Id == attemptId, ct);
                return new AttemptResult(attempt);
            }
            if (m is { Status: MatchStatus.Pending })
                return AttemptResult.Fail(StatusCodes.Status400BadRequest, "Trận của bạn chưa bắt đầu, hãy chờ tới giờ vòng đấu.");
        }
        return AttemptResult.Fail(StatusCodes.Status400BadRequest, "Bạn không có trận nào đang diễn ra.");
    }

    // ---- xem ----------------------------------------------------------

    /// <summary>
    /// Bảng xếp hạng vòng loại, tính từ Attempt (không lưu bảng riêng): giải xong trước (nhanh hơn, rồi ít lỗi hơn),
    /// sau đó người chưa xong theo tiến độ, chưa vào thi xếp cuối.
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
                x.Entry.Seed is not null))
            .ToList();
    }

    private async Task<List<Attempt>> QualifierAttempts(Tournament t, CancellationToken ct) =>
        t.QualifierPuzzleId is null
            ? []
            : await db.Attempts.AsNoTracking()
                .Where(a => a.TournamentId == t.Id && a.PuzzleId == t.QualifierPuzzleId)
                .ToListAsync(ct);

    public async Task<List<StandingResponse>> QualifierStandings(Tournament t, CancellationToken ct = default) =>
        Rank(t.Entries, await QualifierAttempts(t, ct));

    public DateTimeOffset? StageEndsAt(Tournament t)
    {
        switch (t.Status)
        {
            case TournamentStatus.Open: return t.StartsAt;
            case TournamentStatus.Qualifier: return t.QualifierStartedAt?.AddMinutes(t.RoundMinutes);
            case TournamentStatus.Knockout:
                var live = t.Matches.Where(m => m.Round == t.CurrentRound && m.Status == MatchStatus.Live).ToList();
                if (live.Count == 0) return t.RoundStartsAt; // đang nghỉ: đếm ngược tới giờ vòng sau
                // Trận đang chờ: hạn vào phòng; trận đang đấu: giờ hết trận. Vòng xong khi trận cuối xong.
                return live.Max(m => m.StartedAt is { } s ? s.AddMinutes(t.RoundMinutes) : t.RoundStartsAt + ReadyWindow);
            default: return null;
        }
    }

    public static string FormatSummary(Tournament t) =>
        Bracket.Summary(t.Entries.Count, t.BracketSize, t.RoundMinutes, t.Status);

    public async Task<TournamentDetailResponse?> Detail(int id, int? userId, CancellationToken ct = default)
    {
        if (await Load(id, ct) is not { } t)
            return null;

        var names = t.Entries.ToDictionary(e => e.UserId, e => (e.User.Username, e.Seed));
        MatchPlayer? P(int? uid) => uid is { } u && names.TryGetValue(u, out var x) ? new MatchPlayer(u, x.Username, x.Seed) : null;

        var bracket = t.Matches.GroupBy(m => m.Round).OrderBy(g => g.Key)
            .Select(g => new BracketRound(
                g.Key,
                Bracket.RoundName(g.Key, t.RoundCount),
                RoundStart(t, g.Key),
                g.OrderBy(m => m.Slot).Select(m => new MatchResponse(
                    m.Id, m.Round, m.Slot, m.Status, P(m.Player1Id), P(m.Player2Id), m.WinnerId, m.Note, m.StartedAt, m.FinishedAt,
                    m.Ready1At is not null, m.Ready2At is not null)).ToList()))
            .ToList();

        MyMatchResponse? myMatch = null;
        if (userId is { } me && t.Matches.Where(m => m.Player1Id == me || m.Player2Id == me).MaxBy(m => m.Round) is { } mm)
            myMatch = new MyMatchResponse(
                mm.Id, mm.Round, Bracket.RoundName(mm.Round, t.RoundCount), mm.Status,
                P(mm.Player1Id == me ? mm.Player2Id : mm.Player1Id),
                mm.Status == MatchStatus.Done ? mm.WinnerId == me : null,
                mm.StartedAt is not null,
                (mm.Player1Id == me ? mm.Ready1At : mm.Ready2At) is not null,
                (mm.Player1Id == me ? mm.Ready2At : mm.Ready1At) is not null,
                mm.StartedAt);

        var champion = t.Status == TournamentStatus.Closed
            ? P(t.Matches.FirstOrDefault(m => m.Round == t.RoundCount)?.WinnerId)
            : null;

        return new TournamentDetailResponse(
            t.Id, t.Name, t.Description, t.GameType, t.Difficulty, t.Status, t.StartsAt, t.BracketSize, t.RoundMinutes,
            t.Entries.Count, FormatSummary(t), Schedule(t), t.CurrentRound, t.RoundCount, t.RoundStartsAt, StageEndsAt(t),
            DateTimeOffset.UtcNow, SpectatorDelaySeconds,
            userId is { } u2 && t.Entries.Any(e => e.UserId == u2), myMatch, t.ClosedNote,
            await QualifierStandings(t, ct), bracket, champion);
    }

    private DateTimeOffset? RoundStart(Tournament t, int round)
    {
        var started = t.Matches.Where(m => m.Round == round && m.StartedAt != null).Select(m => m.StartedAt).Min();
        if (started is not null) return started;
        if (t.RoundStartsAt is not { } current) return null;
        var gap = TimeSpan.FromMinutes(t.RoundMinutes) + RoundBreak;
        return current + gap * (round - t.CurrentRound); // vòng chưa tới: giờ dự kiến
    }

    private List<ScheduleItem> Schedule(Tournament t)
    {
        var items = new List<ScheduleItem>();
        var length = TimeSpan.FromMinutes(t.RoundMinutes);
        var plan = Bracket.Plan(t.Entries.Count, t.BracketSize);
        var hasQualifier = t.QualifierPuzzleId is not null || (t.Status == TournamentStatus.Open && plan.Qualifier);

        var qualifierStart = t.QualifierStartedAt ?? t.StartsAt;
        if (hasQualifier)
            items.Add(new ScheduleItem("Vòng loại", qualifierStart, qualifierStart + length,
                t.Status == TournamentStatus.Open ? "Upcoming" : t.Status == TournamentStatus.Qualifier ? "Live" : "Done"));

        var rounds = t.RoundCount > 0 ? t.RoundCount : plan.Rounds;
        var firstKnockout = hasQualifier ? qualifierStart + length + RoundBreak : t.StartsAt;
        for (var r = 1; r <= rounds; r++)
        {
            var start = t.RoundCount > 0 ? RoundStart(t, r) : firstKnockout + (length + RoundBreak) * (r - 1);
            var matches = t.Matches.Where(m => m.Round == r).ToList();
            var status = matches.Count > 0 && matches.All(m => m.Status == MatchStatus.Done) ? "Done"
                : matches.Any(m => m.Status == MatchStatus.Live) ? "Live" : "Upcoming";
            items.Add(new ScheduleItem(Bracket.RoundName(r, rounds), start, start + length, status));
        }
        return items;
    }

    /// <summary>
    /// Khán giả xem bàn chơi TRỄ <see cref="SpectatorDelaySeconds"/> giây, để không ai đứng ngoài nhắc được người đang thi.
    /// Người đang thi không xem được trận của chính mình (sẽ thấy bàn đối thủ, cùng đề), và trong vòng loại
    /// không xem được bàn người khác (mọi người cùng một đề).
    /// </summary>
    public async Task<(LiveResponse? Live, string? Error)> Live(int id, int? viewerId, CancellationToken ct = default)
    {
        if (await Load(id, ct) is not { } t)
            return (null, null);
        var asOf = DateTimeOffset.UtcNow.AddSeconds(-SpectatorDelaySeconds);
        var seeds = t.Entries.ToDictionary(e => e.UserId, e => (e.User.Username, e.Seed));
        var matches = new List<LiveMatch>();
        var qualifier = new List<PlayerBoard>();

        if (t.Status == TournamentStatus.Qualifier && t.QualifierPuzzle is { } qp)
        {
            var all = await QualifierAttempts(t, ct);
            if (viewerId is { } v && all.Any(a => a.UserId == v && a.Status == AttemptStatus.InProgress))
                return (null, "Bạn đang thi vòng loại nên không xem được bàn chơi của người khác (cùng một đề).");
            qualifier = all
                .Select(a => Replay.At(a, qp, seeds[a.UserId].Username, null, asOf))
                .OrderByDescending(b => b.Status == AttemptStatus.Solved).ThenByDescending(b => b.Progress).ThenBy(b => b.Mistakes)
                .Take(8)
                .ToList();
        }
        else if (t.Status is TournamentStatus.Knockout or TournamentStatus.Closed)
        {
            // Khán giả sống trễ asOf: chiếu vòng mới nhất đã bắt đầu TÍNH TỚI asOf (vòng sau mới bắt đầu
            // chưa đủ 30 giây thì họ vẫn đang xem vòng trước, kể cả lúc nghỉ giữa vòng).
            var round = t.Matches.Where(m => m.StartedAt is { } s && s <= asOf).Select(m => m.Round).DefaultIfEmpty(0).Max();
            var shown = t.Matches.Where(m => m.Round == round && m.PuzzleId != null
                && !(viewerId is { } v && m.Status == MatchStatus.Live && (m.Player1Id == v || m.Player2Id == v)));
            foreach (var m in shown)
            {
                var puzzle = await db.Puzzles.AsNoTracking().FirstAsync(p => p.Id == m.PuzzleId, ct);
                var pair = await db.Attempts.AsNoTracking()
                    .Where(a => a.Id == m.Attempt1Id || a.Id == m.Attempt2Id).ToListAsync(ct);
                var boards = pair.OrderBy(a => a.Id == m.Attempt1Id ? 0 : 1)
                    .Select(a => Replay.At(a, puzzle, seeds[a.UserId].Username, seeds[a.UserId].Seed, asOf))
                    .ToList();
                // Kết quả trận cũng chỉ lộ khi khán giả "xem tới" lúc đó.
                var doneAsOf = m.FinishedAt is { } f && f <= asOf;
                matches.Add(new LiveMatch(m.Id, m.Round, Bracket.RoundName(m.Round, t.RoundCount),
                    doneAsOf ? MatchStatus.Done : MatchStatus.Live, doneAsOf ? m.WinnerId : null, boards));
            }
        }
        return (new LiveResponse(t.Id, t.Status, SpectatorDelaySeconds, asOf, matches, qualifier), null);
    }

    /// <summary>Màn hình ban tổ chức (chỉ admin): bàn chơi thời gian thực của mọi trận đang diễn ra.</summary>
    public async Task<List<MonitorRow>?> Monitor(int id, CancellationToken ct = default)
    {
        if (await Load(id, ct) is not { } t)
            return null;
        var names = t.Entries.ToDictionary(e => e.UserId, e => e.User.Username);
        var rows = new List<MonitorRow>();
        if (t.Status == TournamentStatus.Qualifier)
        {
            foreach (var a in await db.Attempts.AsNoTracking().Include(a => a.Puzzle)
                         .Where(a => a.TournamentId == t.Id && a.PuzzleId == t.QualifierPuzzleId).ToListAsync(ct))
                rows.Add(ToMonitorRow(a, names[a.UserId], null, null));
            return rows;
        }
        var round = t.Status == TournamentStatus.Closed ? t.RoundCount : t.CurrentRound;
        foreach (var m in t.Matches.Where(m => m.Round == round).OrderBy(m => m.Slot))
        {
            var ids = new[] { m.Attempt1Id, m.Attempt2Id }.Where(x => x != null).ToList();
            var pair = await db.Attempts.AsNoTracking().Include(a => a.Puzzle).Where(a => ids.Contains(a.Id)).ToListAsync(ct);
            foreach (var a in pair.OrderBy(a => a.Id == m.Attempt1Id ? 0 : 1))
                rows.Add(ToMonitorRow(a, names[a.UserId], m.Id, m.WinnerId == a.UserId ? 1 : m.WinnerId is null ? null : 2));
        }
        return rows;
    }

    public static MonitorRow ToMonitorRow(Attempt a, string username, int? matchId, int? finishRank) =>
        new(matchId, a.UserId, username, a.Progress, a.Mistakes, a.Status, finishRank,
            GameEngine.View(a.Puzzle, a.State, a.Status != AttemptStatus.InProgress));

    public async Task<int?> MatchIdOf(Attempt a, CancellationToken ct = default) =>
        await db.TournamentMatches.AsNoTracking()
            .Where(m => m.Attempt1Id == a.Id || m.Attempt2Id == a.Id)
            .Select(m => (int?)m.Id)
            .FirstOrDefaultAsync(ct);
}
