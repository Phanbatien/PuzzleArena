using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Games;

/// <summary>
/// Đánh dấu lượt GIẢI XONG trông bất thường, chỉ dựa vào đồng hồ server và MoveLog.
/// Đây là heuristic để admin xem lại, không phải bằng chứng gian lận.
/// Ngưỡng nằm ở các hằng số dưới đây, chỉnh ở một chỗ.
/// </summary>
public static class CheatDetector
{
    /// <summary>Sudoku: trung bình mỗi ô trống mất ít hơn mức này thì nghi vấn.</summary>
    public const double MinMsPerSudokuCell = 1000;

    /// <summary>Chỉ xét nhịp đi khi có từ ngần này nước trở lên.</summary>
    public const int MinMovesForGapCheck = 10;

    /// <summary>Khoảng cách trung vị giữa 2 nước liên tiếp nhỏ hơn mức này thì giống bot.</summary>
    public const long MinMedianGapMs = 300;

    /// <summary>Dò mìn: tổng thời gian giải thấp hơn mức này thì nghi vấn.</summary>
    public static long MinMinesweeperMs(Difficulty d) => d switch
    {
        Difficulty.Easy => 3_000,
        Difficulty.Medium => 8_000,
        _ => 15_000,
    };

    public readonly record struct LoggedMove(long ElapsedMs, int Index, int Value, char Kind);

    /// <summary>Đọc MoveLog dạng "elapsedMs|index|value|K\n". Dòng hỏng bị bỏ qua.</summary>
    public static List<LoggedMove> ParseLog(string log)
    {
        var moves = new List<LoggedMove>();
        foreach (var line in log.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var p = line.Split('|');
            if (p.Length != 4 || p[3].Length != 1) continue;
            if (!long.TryParse(p[0], out var ms) || !int.TryParse(p[1], out var index) || !int.TryParse(p[2], out var value))
                continue;
            moves.Add(new LoggedMove(ms, index, value, p[3][0]));
        }
        return moves;
    }

    /// <summary>Số nước người chơi thật sự đi (không tính dòng 'V' do admin hủy).</summary>
    public static int CountMoves(string log) => ParseLog(log).Count(m => m.Kind != 'V');

    /// <summary>Danh sách lý do nghi vấn (rỗng = bình thường). Cần Attempt.Puzzle đã được nạp.</summary>
    public static List<string> Analyze(Attempt a)
    {
        var reasons = new List<string>();
        if (a.DurationMs is not long duration) return reasons;

        var puzzle = a.Puzzle;
        if (puzzle.GameType == GameType.Sudoku)
        {
            int empty = puzzle.BoardConfig.Count(c => c == '0');
            if (empty > 0 && (double)duration / empty < MinMsPerSudokuCell)
                reasons.Add($"Giải quá nhanh: trung bình {duration / empty} ms mỗi ô (ngưỡng {MinMsPerSudokuCell} ms).");
        }
        else
        {
            long min = MinMinesweeperMs(puzzle.Difficulty);
            if (duration < min)
                reasons.Add($"Giải quá nhanh: {duration} ms cho cả bàn (ngưỡng {min} ms).");
        }

        var moves = ParseLog(a.MoveLog).Where(m => m.Kind != 'V').OrderBy(m => m.ElapsedMs).ToList();
        if (moves.Count >= MinMovesForGapCheck)
        {
            var gaps = new List<long>();
            for (int i = 1; i < moves.Count; i++)
                gaps.Add(moves[i].ElapsedMs - moves[i - 1].ElapsedMs);
            gaps.Sort();
            long median = gaps[gaps.Count / 2];
            if (median < MinMedianGapMs)
                reasons.Add($"Nhịp đi giống bot: khoảng cách trung vị giữa 2 nước chỉ {median} ms (ngưỡng {MinMedianGapMs} ms).");
        }

        return reasons;
    }
}
