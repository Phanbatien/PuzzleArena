using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Games;

/// <summary>
/// Chỗ DUY NHẤT code khác (API của BE2, daily của BE1, giải đấu của BE3) được gọi vào game.
/// Hợp đồng ở mục 5 của TEAM-PLAN.
///
/// Quy ước nước đi (Apply):
///   Sudoku      : index 0..80, value 1..9.  Correct=false nghĩa là điền sai (người gọi cộng 1 lỗi, ô không đổi).
///   Minesweeper : index 0..rows*cols-1, value = 0 (mở ô). Cắm cờ là việc của client, không gửi lên server.
///                 Correct=false nghĩa là trúng mìn (thua ngay).
/// Apply trả null khi nước không hợp lệ (ngoài bàn, ô cho sẵn, ô đã điền/đã mở, giá trị sai khoảng).
/// Người gọi phải tự chặn ván đã kết thúc / quá hạn / không đúng chủ lượt TRƯỚC khi gọi Apply.
/// </summary>
public static class GameEngine
{
    public static int MaxMistakes(GameType game) => game == GameType.Sudoku ? 3 : 1;

    public static Puzzle Generate(GameType game, Difficulty difficulty, int seed)
    {
        var p = new Puzzle { GameType = game, Difficulty = difficulty, Seed = seed };
        switch (game)
        {
            case GameType.Sudoku:
                var (givens, solution) = Sudoku.Generate(difficulty, seed);
                p.BoardConfig = givens;
                p.Solution = solution;
                break;
            case GameType.Minesweeper:
                p.BoardConfig = Minesweeper.ConfigString(difficulty);
                p.Solution = Minesweeper.Generate(difficulty, seed);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(game));
        }
        return p;
    }

    public static string InitialState(Puzzle p) => p.GameType switch
    {
        GameType.Sudoku => p.BoardConfig,
        GameType.Minesweeper => Minesweeper.InitialState(p),
        _ => throw new ArgumentOutOfRangeException(nameof(p)),
    };

    public static MoveOutcome? Apply(Puzzle p, string state, int index, int value) => p.GameType switch
    {
        GameType.Sudoku => ApplySudoku(p, state, index, value),
        GameType.Minesweeper => value == 0 ? Minesweeper.Open(p, state, index) : null,
        _ => throw new ArgumentOutOfRangeException(nameof(p)),
    };

    /// <summary>Tiến độ 0..100.</summary>
    public static int Progress(Puzzle p, string state) => p.GameType switch
    {
        GameType.Sudoku => SudokuProgress(p, state),
        GameType.Minesweeper => Minesweeper.Progress(p, state),
        _ => throw new ArgumentOutOfRangeException(nameof(p)),
    };

    /// <summary>Dữ liệu bàn gửi client. Không bao giờ chứa Solution; vị trí mìn chỉ lộ khi finished = true.</summary>
    public static BoardView View(Puzzle p, string state, bool finished)
    {
        if (p.GameType == GameType.Sudoku)
            return new BoardView(GameType.Sudoku, 9, 9, 0, state, p.BoardConfig);

        var (rows, cols, mines) = Minesweeper.ParseConfig(p.BoardConfig);
        return new BoardView(GameType.Minesweeper, rows, cols, mines, Minesweeper.Reveal(p, state, finished), null);
    }

    // ---- Sudoku --------------------------------------------------------------

    // Đề có đúng 1 đáp án nên "sai so với đáp án" gồm cả trường hợp số trùng hàng/cột/ô.
    private static MoveOutcome? ApplySudoku(Puzzle p, string state, int index, int value)
    {
        if (state.Length != Sudoku.Size || index < 0 || index >= Sudoku.Size) return null;
        if (value < 1 || value > 9) return null;
        if (p.BoardConfig[index] != '0') return null; // ô cho sẵn
        if (state[index] != '0') return null;          // ô đã điền đúng rồi

        char digit = (char)('0' + value);
        if (p.Solution[index] != digit)
            return new MoveOutcome(state, Correct: false, Solved: false); // sai: không ghi vào bàn

        var cells = state.ToCharArray();
        cells[index] = digit;
        string next = new string(cells);
        return new MoveOutcome(next, Correct: true, Solved: next == p.Solution);
    }

    private static int SudokuProgress(Puzzle p, string state)
    {
        int empty = 0, filled = 0;
        for (int i = 0; i < Sudoku.Size; i++)
        {
            if (p.BoardConfig[i] != '0') continue;
            empty++;
            if (state[i] != '0') filled++;
        }
        return empty == 0 ? 100 : filled * 100 / empty;
    }
}
