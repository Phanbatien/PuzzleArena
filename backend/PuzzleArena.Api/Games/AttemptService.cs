using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Boosters;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Api.Games;

/// <summary>Kết quả chung của Start/Get/Move/Abandon. Error != null thì Status là mã HTTP lỗi.</summary>
public sealed record AttemptResult(
    Attempt? Attempt,
    string? Error = null,
    int Status = 200,
    bool Correct = false,
    bool Shielded = false)
{
    public static AttemptResult Fail(int status, string error) => new(null, error, status);
}

/// <summary>
/// Gọi sau mỗi thay đổi của một lượt (nước đi, bỏ cuộc, hết giờ). BE3 dùng để phát tiến độ giải đấu qua SignalR.
/// </summary>
public interface IAttemptEvents
{
    Task Changed(Attempt attempt, CancellationToken ct = default);
}

/// <summary>
/// Trọng tài của một lượt chơi. Mọi quyết định (đúng/sai, thua, hết giờ, đúng chủ lượt) nằm ở đây,
/// client không bao giờ tự quyết thắng thua. BE3 (giải đấu) cũng gọi <see cref="Start"/> để tạo lượt.
///
/// MoveLog: mỗi nước một dòng "elapsedMs|index|value|K\n" với K = C (đúng), W (sai, tính lỗi),
/// S (sai nhưng được Khiên đỡ). Đồng hồ lấy từ server (elapsedMs = lúc nhận nước - StartedAt).
/// </summary>
public sealed class AttemptService(
    AppDb db,
    IBoosterService boosters,
    IRatingService ratings,
    IAttemptEvents? events = null)
{
    public async Task<Attempt> Start(
        int userId,
        Puzzle puzzle,
        int? tournamentId = null,
        DateTimeOffset? deadline = null,
        CancellationToken ct = default)
    {
        var state = GameEngine.InitialState(puzzle);
        var attempt = new Attempt
        {
            UserId = userId,
            Puzzle = puzzle,
            TournamentId = tournamentId,
            StartedAt = DateTimeOffset.UtcNow,
            Deadline = deadline,
            Status = AttemptStatus.InProgress,
            State = state,
            Progress = GameEngine.Progress(puzzle, state),
            MoveLog = "",
        };
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync(ct);
        return attempt;
    }

    public async Task<AttemptResult> Get(int userId, bool isAdmin, int attemptId, CancellationToken ct = default)
    {
        var attempt = await Load(attemptId, ct);
        if (attempt is null)
            return AttemptResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy lượt chơi.");
        if (attempt.UserId != userId && !isAdmin)
            return AttemptResult.Fail(StatusCodes.Status403Forbidden, "Đây không phải lượt chơi của bạn.");

        if (await ExpireIfNeeded(attempt, DateTimeOffset.UtcNow, ct))
            await Notify(attempt, ct);
        return new AttemptResult(attempt);
    }

    public async Task<AttemptResult> Move(int userId, int attemptId, int index, int value, CancellationToken ct = default)
    {
        var result = await MoveCore(userId, attemptId, index, value, ct);
        if (result.Attempt is not null)
            await Notify(result.Attempt, ct);
        return result;
    }

    private async Task<AttemptResult> MoveCore(int userId, int attemptId, int index, int value, CancellationToken ct)
    {
        var attempt = await Load(attemptId, ct);
        if (attempt is null)
            return AttemptResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy lượt chơi.");
        if (attempt.UserId != userId)
            return AttemptResult.Fail(StatusCodes.Status403Forbidden, "Đây không phải lượt chơi của bạn.");

        var now = DateTimeOffset.UtcNow;
        if (await ExpireIfNeeded(attempt, now, ct))
        {
            await Notify(attempt, ct);
            return AttemptResult.Fail(StatusCodes.Status400BadRequest, "Đã hết giờ, lượt chơi kết thúc.");
        }
        if (attempt.Status != AttemptStatus.InProgress)
            return AttemptResult.Fail(StatusCodes.Status400BadRequest, "Lượt chơi đã kết thúc.");

        var puzzle = attempt.Puzzle;
        var outcome = GameEngine.Apply(puzzle, attempt.State, index, value);
        if (outcome is null)
            return AttemptResult.Fail(StatusCodes.Status400BadRequest, "Nước đi không hợp lệ.");

        long elapsed = Math.Max(0L, (long)(now - attempt.StartedAt).TotalMilliseconds);

        if (outcome.Correct)
        {
            attempt.State = outcome.State;
            attempt.Progress = GameEngine.Progress(puzzle, attempt.State);
            Log(attempt, elapsed, index, value, 'C');

            if (outcome.Solved)
            {
                attempt.Progress = 100;
                await Finish(attempt, solved: true, at: now, ct);
                return new AttemptResult(attempt, Correct: true);
            }

            await db.SaveChangesAsync(ct);
            return new AttemptResult(attempt, Correct: true);
        }

        // Nước sai (Sudoku: điền sai; Dò mìn: trúng mìn).
        // Khiên: chỉ ngoài giải đấu, đỡ đúng 1 lỗi mỗi lượt, tự dùng khi người chơi còn Khiên.
        bool shielded = attempt.TournamentId is null
            && !ShieldUsed(attempt)
            && await boosters.TryConsume(attempt.UserId, BoosterType.Shield, attempt.Id, ct);

        // Dò mìn: ô mìn hiện '*' (đã lộ); Sudoku: bàn giữ nguyên.
        if (puzzle.GameType == GameType.Minesweeper)
            attempt.State = outcome.State;

        if (shielded)
        {
            Log(attempt, elapsed, index, value, 'S');
            await db.SaveChangesAsync(ct);
            return new AttemptResult(attempt, Correct: false, Shielded: true);
        }

        attempt.Mistakes++;
        Log(attempt, elapsed, index, value, 'W');

        if (attempt.Mistakes >= GameEngine.MaxMistakes(puzzle.GameType))
        {
            await Finish(attempt, solved: false, at: now, ct);
            return new AttemptResult(attempt, Correct: false);
        }

        await db.SaveChangesAsync(ct);
        return new AttemptResult(attempt, Correct: false);
    }

    public async Task<AttemptResult> Abandon(int userId, int attemptId, CancellationToken ct = default)
    {
        var attempt = await Load(attemptId, ct);
        if (attempt is null)
            return AttemptResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy lượt chơi.");
        if (attempt.UserId != userId)
            return AttemptResult.Fail(StatusCodes.Status403Forbidden, "Đây không phải lượt chơi của bạn.");

        var now = DateTimeOffset.UtcNow;
        var wasInProgress = attempt.Status == AttemptStatus.InProgress;
        if (!await ExpireIfNeeded(attempt, now, ct) && attempt.Status == AttemptStatus.InProgress)
            await Finish(attempt, solved: false, at: now, ct);
        if (wasInProgress)
            await Notify(attempt, ct);

        return new AttemptResult(attempt); // gọi lại khi đã kết thúc thì trả nguyên trạng thái (idempotent)
    }

    /// <summary>
    /// Lượt giải xong nhưng bất thường (xem <see cref="CheatDetector"/>), nhanh nhất trước.
    /// Chỉ xét 500 lượt giải xong gần nhất cho nhẹ.
    /// </summary>
    public async Task<List<SuspiciousAttemptResponse>> ListSuspicious(
        GameType? game, int limit, CancellationToken ct = default)
    {
        IQueryable<Attempt> query = db.Attempts.AsNoTracking()
            .Include(a => a.Puzzle)
            .Include(a => a.User)
            .Where(a => a.Status == AttemptStatus.Solved && a.DurationMs != null);
        if (game is not null)
        {
            var g = game.Value;
            query = query.Where(a => a.Puzzle.GameType == g);
        }

        var recent = await query.OrderByDescending(a => a.Id).Take(500).ToListAsync(ct);
        return recent
            .Select(a => new { Attempt = a, Reasons = CheatDetector.Analyze(a) })
            .Where(x => x.Reasons.Count > 0)
            .OrderBy(x => x.Attempt.DurationMs)
            .Take(limit)
            .Select(x => new SuspiciousAttemptResponse(
                x.Attempt.Id,
                x.Attempt.UserId,
                x.Attempt.User.Username,
                x.Attempt.Puzzle.GameType,
                x.Attempt.Puzzle.Difficulty,
                x.Attempt.DurationMs,
                x.Attempt.Mistakes,
                CheatDetector.CountMoves(x.Attempt.MoveLog),
                x.Attempt.TournamentId,
                x.Attempt.FinishedAt,
                x.Reasons))
            .ToList();
    }

    /// <summary>
    /// Admin hủy kết quả một lượt đã giải xong: đặt thành thua, hoàn lại Elo, ghi dòng 'V' vào MoveLog.
    /// Gọi lại khi đã hủy thì không làm gì thêm. Bổ trợ đã thưởng khi thắng KHÔNG bị thu hồi.
    /// </summary>
    public async Task<AttemptResult> Void(int attemptId, CancellationToken ct = default)
    {
        var attempt = await Load(attemptId, ct);
        if (attempt is null)
            return AttemptResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy lượt chơi.");

        if (attempt.MoveLog.Contains("|V\n"))
            return new AttemptResult(attempt);
        if (attempt.Status != AttemptStatus.Solved)
            return AttemptResult.Fail(StatusCodes.Status400BadRequest, "Chỉ hủy được lượt đã giải xong.");

        attempt.Status = AttemptStatus.Failed;
        attempt.MoveLog += "0|-1|0|V\n";

        var rating = await db.AttemptRatings.FirstOrDefaultAsync(r => r.AttemptId == attempt.Id, ct);
        if (rating is not null)
        {
            var userRating = await db.UserRatings.FirstOrDefaultAsync(
                r => r.UserId == attempt.UserId && r.GameType == attempt.Puzzle.GameType, ct);
            if (userRating is not null)
                userRating.Value -= rating.Delta;
            db.AttemptRatings.Remove(rating);
        }

        await db.SaveChangesAsync(ct);
        return new AttemptResult(attempt);
    }

    /// <summary>
    /// Bắt đầu lượt chơi từ một đề daily của HÔM NAY. Mỗi người chỉ chơi mỗi đề 1 lần:
    /// đã có lượt (đang chơi, thắng hay thua) thì trả lại đúng lượt đó, không tạo thêm.
    /// </summary>
    public async Task<AttemptResult> StartDaily(int userId, int puzzleId, CancellationToken ct = default)
    {
        var puzzle = await db.Puzzles.FirstOrDefaultAsync(p => p.Id == puzzleId && p.IsDaily, ct);
        if (puzzle is null)
            return AttemptResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy đề daily.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (puzzle.DailyDate != today)
            return AttemptResult.Fail(StatusCodes.Status400BadRequest, "Đề daily này không phải của hôm nay.");

        // Lấy lượt mới nhất, cùng cách chọn với GET /api/daily của BE1.
        var existing = await db.Attempts.Include(a => a.Puzzle)
            .Where(a => a.UserId == userId && a.PuzzleId == puzzleId && a.TournamentId == null)
            .OrderByDescending(a => a.Id)
            .FirstOrDefaultAsync(ct);
        if (existing is not null)
            return new AttemptResult(existing);

        var attempt = await Start(userId, puzzle, ct: ct);
        return new AttemptResult(attempt);
    }

    public async Task<AttemptResponse> ToResponse(Attempt a, CancellationToken ct = default)
    {
        bool finished = a.Status != AttemptStatus.InProgress;
        int? delta = null;
        if (finished)
        {
            delta = await db.AttemptRatings.AsNoTracking()
                .Where(r => r.AttemptId == a.Id)
                .Select(r => (int?)r.Delta)
                .FirstOrDefaultAsync(ct);
        }

        return new AttemptResponse(
            a.Id,
            a.PuzzleId,
            a.Puzzle.GameType,
            a.Puzzle.Difficulty,
            a.Status,
            a.Mistakes,
            GameEngine.MaxMistakes(a.Puzzle.GameType),
            a.Progress,
            a.StartedAt,
            a.Deadline,
            a.FinishedAt,
            a.DurationMs,
            DateTimeOffset.UtcNow,
            delta,
            GameEngine.View(a.Puzzle, a.State, finished));
    }

    // ---- nội bộ -------------------------------------------------------------

    private Task<Attempt?> Load(int attemptId, CancellationToken ct) =>
        db.Attempts.Include(a => a.Puzzle).FirstOrDefaultAsync(a => a.Id == attemptId, ct);

    // Quá hạn thì thua, tính tại thời điểm hết hạn (không tính thêm thời gian trễ của người chơi).
    private async Task<bool> ExpireIfNeeded(Attempt a, DateTimeOffset now, CancellationToken ct)
    {
        if (a.Status != AttemptStatus.InProgress || a.Deadline is null || now <= a.Deadline)
            return false;

        await Finish(a, solved: false, at: a.Deadline.Value, ct);
        return true;
    }

    // Lưu trạng thái cuối TRƯỚC, rồi mới cập nhật Elo (RatingService đếm số ván đã giải từ database).
    private async Task Finish(Attempt a, bool solved, DateTimeOffset at, CancellationToken ct)
    {
        a.Status = solved ? AttemptStatus.Solved : AttemptStatus.Failed;
        a.FinishedAt = at;
        a.DurationMs = Math.Max(0L, (long)(at - a.StartedAt).TotalMilliseconds);
        await db.SaveChangesAsync(ct);
        await ratings.ApplyResult(a.UserId, a.Id, solved, ct); // chỉ tác dụng với đề daily, ván khác trả null
    }

    private Task Notify(Attempt a, CancellationToken ct) => events?.Changed(a, ct) ?? Task.CompletedTask;

    private static void Log(Attempt a, long elapsedMs, int index, int value, char kind) =>
        a.MoveLog += $"{elapsedMs}|{index}|{value}|{kind}\n";

    private static bool ShieldUsed(Attempt a) => a.MoveLog.Contains("|S\n");
}
