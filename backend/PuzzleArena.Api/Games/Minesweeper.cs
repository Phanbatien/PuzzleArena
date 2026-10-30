using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Games;

/// <summary>
/// Dò mìn theo seed. Mọi người chơi chung một bàn nên ô GIỮA và 8 ô quanh nó không bao giờ có mìn
/// (luôn là điểm xuất phát an toàn, mở sẵn cho tất cả).
///
/// Solution: chuỗi rows*cols ký tự, 'M' là mìn, '.' là an toàn.
/// State   : chuỗi rows*cols ký tự, '#' chưa mở, '0'..'8' đã mở (số mìn xung quanh), '*' ô mìn đã bị mở (thua).
/// Cờ chỉ nằm ở client, server không biết và không cần biết.
/// </summary>
public static class Minesweeper
{
    public static (int Rows, int Cols, int Mines) Dimensions(Difficulty d) => d switch
    {
        Difficulty.Easy => (9, 9, 10),
        Difficulty.Medium => (16, 16, 40),
        _ => (16, 30, 99),
    };

    public static string ConfigString(Difficulty d)
    {
        var (r, c, m) = Dimensions(d);
        return $"{r}x{c}x{m}";
    }

    public static (int Rows, int Cols, int Mines) ParseConfig(string config)
    {
        var parts = config.Split('x');
        return (int.Parse(parts[0]), int.Parse(parts[1]), int.Parse(parts[2]));
    }

    /// <summary>Chỉ số ô giữa bàn (điểm xuất phát an toàn).</summary>
    public static int CenterIndex(int rows, int cols) => (rows / 2) * cols + cols / 2;

    public static string Generate(Difficulty difficulty, int seed)
    {
        var (rows, cols, mines) = Dimensions(difficulty);
        var rng = new Random(seed);

        int center = CenterIndex(rows, cols);
        int cr = center / cols, cc = center % cols;

        var candidates = new List<int>();
        for (int i = 0; i < rows * cols; i++)
        {
            int r = i / cols, c = i % cols;
            bool inSafeZone = Math.Abs(r - cr) <= 1 && Math.Abs(c - cc) <= 1;
            if (!inSafeZone) candidates.Add(i);
        }

        for (int i = candidates.Count - 1; i > 0; i--)
        {
            int j = rng.Next(i + 1);
            (candidates[i], candidates[j]) = (candidates[j], candidates[i]);
        }

        var layout = new char[rows * cols];
        Array.Fill(layout, '.');
        for (int k = 0; k < mines; k++) layout[candidates[k]] = 'M';
        return new string(layout);
    }

    /// <summary>Bàn lúc bắt đầu: tất cả '#', riêng vùng quanh ô giữa đã được mở (loang nếu là ô 0).</summary>
    public static string InitialState(Puzzle p)
    {
        var (rows, cols, _) = ParseConfig(p.BoardConfig);
        var state = new string('#', rows * cols);
        return Open(p, state, CenterIndex(rows, cols))!.State;
    }

    /// <summary>Mở ô <paramref name="index"/>. null nếu ô không hợp lệ hoặc đã mở rồi.</summary>
    public static MoveOutcome? Open(Puzzle p, string state, int index)
    {
        var (rows, cols, _) = ParseConfig(p.BoardConfig);
        if (state.Length != rows * cols || index < 0 || index >= rows * cols) return null;
        if (state[index] != '#') return null;

        var cells = state.ToCharArray();

        if (p.Solution[index] == 'M')
        {
            cells[index] = '*';
            return new MoveOutcome(new string(cells), Correct: false, Solved: false);
        }

        // Loang bằng hàng đợi (không đệ quy, bàn 16x30 vẫn an toàn).
        var queue = new Queue<int>();
        cells[index] = Digit(p.Solution, rows, cols, index);
        if (cells[index] == '0') queue.Enqueue(index);
        while (queue.Count > 0)
        {
            int cur = queue.Dequeue();
            foreach (int n in Neighbors(cur, rows, cols))
            {
                if (cells[n] != '#') continue;
                cells[n] = Digit(p.Solution, rows, cols, n);
                if (cells[n] == '0') queue.Enqueue(n);
            }
        }

        string next = new string(cells);
        return new MoveOutcome(next, Correct: true, Solved: IsSolved(p, next));
    }

    /// <summary>Thắng khi mọi ô an toàn đã mở.</summary>
    public static bool IsSolved(Puzzle p, string state)
    {
        for (int i = 0; i < state.Length; i++)
            if (state[i] == '#' && p.Solution[i] != 'M') return false;
        return true;
    }

    public static int Progress(Puzzle p, string state)
    {
        int safeTotal = 0, opened = 0;
        for (int i = 0; i < state.Length; i++)
        {
            if (p.Solution[i] == 'M') continue;
            safeTotal++;
            if (state[i] >= '0' && state[i] <= '8') opened++;
        }
        return safeTotal == 0 ? 100 : opened * 100 / safeTotal;
    }

    /// <summary>Khi ván kết thúc mới lộ vị trí mìn ('*'); chưa kết thúc thì giữ nguyên state.</summary>
    public static string Reveal(Puzzle p, string state, bool finished)
    {
        if (!finished) return state;
        var cells = state.ToCharArray();
        for (int i = 0; i < cells.Length; i++)
            if (p.Solution[i] == 'M') cells[i] = '*';
        return new string(cells);
    }

    private static char Digit(string solution, int rows, int cols, int index)
    {
        int n = 0;
        foreach (int nb in Neighbors(index, rows, cols))
            if (solution[nb] == 'M') n++;
        return (char)('0' + n);
    }

    public static IEnumerable<int> Neighbors(int index, int rows, int cols)
    {
        int r = index / cols, c = index % cols;
        for (int dr = -1; dr <= 1; dr++)
            for (int dc = -1; dc <= 1; dc++)
            {
                if (dr == 0 && dc == 0) continue;
                int nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                yield return nr * cols + nc;
            }
    }
}
