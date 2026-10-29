using PuzzleArena.Api.Domain;

using System.Numerics;

namespace PuzzleArena.Api.Games;

/// <summary>
/// Sinh đề Sudoku theo seed. Đề luôn có ĐÚNG 1 đáp án: mỗi lần xóa một ô,
/// ta đếm số nghiệm bằng backtracking (dừng khi thấy 2 nghiệm); nếu còn &gt; 1 nghiệm thì trả ô lại.
/// </summary>
public static class Sudoku
{
    public const int Size = 81;

    public static int GivenCount(Difficulty d) => d switch
    {
        Difficulty.Easy => 42,
        Difficulty.Medium => 34,
        _ => 28,
    };

    /// <summary>Trả về (givens, solution), mỗi cái là chuỗi 81 chữ số; givens dùng '0' cho ô trống.</summary>
    public static (string Givens, string Solution) Generate(Difficulty difficulty, int seed)
    {
        var rng = new Random(seed);
        int target = GivenCount(difficulty);

        int[]? bestGrid = null;
        int[]? bestSolution = null;
        int bestGivens = int.MaxValue;

        // Xóa ngẫu nhiên có thể kẹt trước khi chạm mục tiêu; thử lại với thứ tự xóa khác, rồi bàn đầy khác.
        for (int board = 0; board < 5; board++)
        {
            var solution = RandomFullGrid(rng);
            for (int attempt = 0; attempt < 8; attempt++)
            {
                var grid = (int[])solution.Clone();
                var order = Shuffled(Size, rng);
                int givens = Size;
                foreach (int cell in order)
                {
                    if (givens <= target) break;
                    int keep = grid[cell];
                    grid[cell] = 0;
                    if (CountSolutions(grid, 2) == 1) givens--;
                    else grid[cell] = keep;
                }

                if (givens < bestGivens || bestGrid == null)
                {
                    bestGivens = givens;
                    bestGrid = grid;
                    bestSolution = solution;
                }
                if (givens <= target) goto done;
            }
        }
    done:
        return (Encode(bestGrid!), Encode(bestSolution!));
    }

    /// <summary>Đếm số nghiệm của lưới (0 = ô trống), dừng sớm khi đạt <paramref name="limit"/>.</summary>
    public static int CountSolutions(int[] grid, int limit = 2)
    {
        var row = new int[9];
        var col = new int[9];
        var box = new int[9];
        for (int i = 0; i < Size; i++)
        {
            int v = grid[i];
            if (v == 0) continue;
            int bit = 1 << v;
            int r = i / 9, c = i % 9;
            if ((row[r] & bit) != 0 || (col[c] & bit) != 0 || (box[(r / 3) * 3 + c / 3] & bit) != 0)
                return 0; // lưới cho sẵn đã mâu thuẫn
            row[r] |= bit; col[c] |= bit; box[(r / 3) * 3 + c / 3] |= bit;
        }
        var work = (int[])grid.Clone();
        int count = 0;
        Search(work, row, col, box, limit, ref count);
        return count;
    }

    public static int CountSolutions(string cells, int limit = 2) => CountSolutions(Decode(cells), limit);

    /// <summary>Lưới 81 chữ số có phải một đáp án hợp lệ (mỗi hàng/cột/ô 3x3 đủ 1..9) không.</summary>
    public static bool IsValidSolution(string cells)
    {
        if (cells.Length != Size) return false;
        var g = Decode(cells);
        for (int u = 0; u < 9; u++)
        {
            int r = 0, c = 0, b = 0;
            for (int k = 0; k < 9; k++)
            {
                r |= 1 << g[u * 9 + k];
                c |= 1 << g[k * 9 + u];
                b |= 1 << g[((u / 3) * 3 + k / 3) * 9 + (u % 3) * 3 + k % 3];
            }
            if (r != 0x3FE || c != 0x3FE || b != 0x3FE) return false;
        }
        return true;
    }

    public static int[] Decode(string cells)
    {
        var g = new int[cells.Length];
        for (int i = 0; i < g.Length; i++) g[i] = cells[i] - '0';
        return g;
    }

    public static string Encode(int[] grid)
    {
        var chars = new char[grid.Length];
        for (int i = 0; i < chars.Length; i++) chars[i] = (char)('0' + grid[i]);
        return new string(chars);
    }

    // ---- nội bộ -------------------------------------------------------------

    // Chọn ô còn ít khả năng nhất (MRV) cho nhanh.
    private static void Search(int[] grid, int[] row, int[] col, int[] box, int limit, ref int count)
    {
        if (count >= limit) return;

        int best = -1, bestAvail = 0, bestCount = 10;
        for (int i = 0; i < Size; i++)
        {
            if (grid[i] != 0) continue;
            int r = i / 9, c = i % 9;
            int avail = ~(row[r] | col[c] | box[(r / 3) * 3 + c / 3]) & 0x3FE;
            int n = BitOperations.PopCount((uint)avail);
            if (n == 0) return; // ngõ cụt
            if (n < bestCount)
            {
                best = i; bestAvail = avail; bestCount = n;
                if (n == 1) break;
            }
        }

        if (best == -1) { count++; return; } // hết ô trống: một nghiệm

        int br = best / 9, bc = best % 9, bb = (br / 3) * 3 + bc / 3;
        for (int d = 1; d <= 9; d++)
        {
            int bit = 1 << d;
            if ((bestAvail & bit) == 0) continue;
            grid[best] = d;
            row[br] |= bit; col[bc] |= bit; box[bb] |= bit;
            Search(grid, row, col, box, limit, ref count);
            grid[best] = 0;
            row[br] &= ~bit; col[bc] &= ~bit; box[bb] &= ~bit;
            if (count >= limit) return;
        }
    }

    private static int[] RandomFullGrid(Random rng)
    {
        var grid = new int[Size];
        var row = new int[9];
        var col = new int[9];
        var box = new int[9];
        bool ok = Fill(0, grid, row, col, box, rng);
        if (!ok) throw new InvalidOperationException("Không sinh được bàn Sudoku đầy đủ."); // không xảy ra
        return grid;
    }

    private static bool Fill(int pos, int[] grid, int[] row, int[] col, int[] box, Random rng)
    {
        if (pos == Size) return true;
        int r = pos / 9, c = pos % 9, b = (r / 3) * 3 + c / 3;
        int avail = ~(row[r] | col[c] | box[b]) & 0x3FE;
        if (avail == 0) return false;

        var digits = new List<int>(9);
        for (int d = 1; d <= 9; d++) if ((avail & (1 << d)) != 0) digits.Add(d);
        Shuffle(digits, rng);

        foreach (int d in digits)
        {
            int bit = 1 << d;
            grid[pos] = d;
            row[r] |= bit; col[c] |= bit; box[b] |= bit;
            if (Fill(pos + 1, grid, row, col, box, rng)) return true;
            grid[pos] = 0;
            row[r] &= ~bit; col[c] &= ~bit; box[b] &= ~bit;
        }
        return false;
    }

    private static int[] Shuffled(int n, Random rng)
    {
        var a = new int[n];
        for (int i = 0; i < n; i++) a[i] = i;
        for (int i = n - 1; i > 0; i--)
        {
            int j = rng.Next(i + 1);
            (a[i], a[j]) = (a[j], a[i]);
        }
        return a;
    }

    private static void Shuffle<T>(List<T> list, Random rng)
    {
        for (int i = list.Count - 1; i > 0; i--)
        {
            int j = rng.Next(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }
}
