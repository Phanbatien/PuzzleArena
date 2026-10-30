using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;
using Xunit;

namespace PuzzleArena.Tests;

public class SudokuTests
{
    [Theory]
    [InlineData(Difficulty.Easy, 42)]
    [InlineData(Difficulty.Medium, 34)]
    [InlineData(Difficulty.Hard, 28)]
    public void Puzzle_HasExactlyOneSolution_AndRightNumberOfGivens(Difficulty d, int expectedGivens)
    {
        foreach (int seed in new[] { 1, 2, 3, 12345 })
        {
            var p = GameEngine.Generate(GameType.Sudoku, d, seed);

            Assert.True(Sudoku.IsValidSolution(p.Solution));
            Assert.Equal(expectedGivens, p.BoardConfig.Count(c => c != '0'));
            Assert.Equal(1, Sudoku.CountSolutions(p.BoardConfig, 2));

            // Ô cho sẵn phải khớp đáp án.
            for (int i = 0; i < 81; i++)
                if (p.BoardConfig[i] != '0') Assert.Equal(p.Solution[i], p.BoardConfig[i]);
        }
    }

    [Fact]
    public void SameSeed_GivesSamePuzzle_DifferentSeed_GivesDifferent()
    {
        var a = GameEngine.Generate(GameType.Sudoku, Difficulty.Medium, 7);
        var b = GameEngine.Generate(GameType.Sudoku, Difficulty.Medium, 7);
        var c = GameEngine.Generate(GameType.Sudoku, Difficulty.Medium, 8);
        Assert.Equal(a.BoardConfig, b.BoardConfig);
        Assert.Equal(a.Solution, b.Solution);
        Assert.NotEqual(a.Solution, c.Solution);
    }

    [Fact]
    public void Apply_WrongDigit_IsIncorrect_AndBoardUnchanged()
    {
        var p = GameEngine.Generate(GameType.Sudoku, Difficulty.Easy, 1);
        string state = GameEngine.InitialState(p);
        int cell = state.IndexOf('0');
        int wrong = p.Solution[cell] == '1' ? 2 : 1;

        var outcome = GameEngine.Apply(p, state, cell, wrong);

        Assert.NotNull(outcome);
        Assert.False(outcome!.Correct);
        Assert.False(outcome.Solved);
        Assert.Equal(state, outcome.State);
    }

    [Fact]
    public void Apply_InvalidMoves_ReturnNull()
    {
        var p = GameEngine.Generate(GameType.Sudoku, Difficulty.Easy, 1);
        string state = GameEngine.InitialState(p);
        int given = state.IndexOf(state.First(c => c != '0'));

        Assert.Null(GameEngine.Apply(p, state, given, 5));   // ô cho sẵn
        Assert.Null(GameEngine.Apply(p, state, -1, 5));      // ngoài bàn
        Assert.Null(GameEngine.Apply(p, state, 81, 5));
        Assert.Null(GameEngine.Apply(p, state, state.IndexOf('0'), 0));  // giá trị ngoài 1..9
        Assert.Null(GameEngine.Apply(p, state, state.IndexOf('0'), 10));
    }

    [Fact]
    public void FillingAllCorrectly_SolvesPuzzle_AndProgressReaches100()
    {
        var p = GameEngine.Generate(GameType.Sudoku, Difficulty.Easy, 5);
        string state = GameEngine.InitialState(p);
        Assert.Equal(0, GameEngine.Progress(p, state));

        MoveOutcome? last = null;
        for (int i = 0; i < 81; i++)
        {
            if (state[i] != '0') continue;
            last = GameEngine.Apply(p, state, i, p.Solution[i] - '0');
            Assert.NotNull(last);
            Assert.True(last!.Correct);
            state = last.State;
        }

        Assert.True(last!.Solved);
        Assert.Equal(100, GameEngine.Progress(p, state));

        // Ô đã điền rồi thì không nhận thêm nước đi.
        Assert.Null(GameEngine.Apply(p, state, 0, p.Solution[0] - '0'));
    }

    [Fact]
    public void View_NeverContainsSolution()
    {
        var p = GameEngine.Generate(GameType.Sudoku, Difficulty.Hard, 3);
        var view = GameEngine.View(p, GameEngine.InitialState(p), finished: false);
        Assert.Equal(p.BoardConfig, view.Cells);
        Assert.NotEqual(p.Solution, view.Cells);
        Assert.Equal(p.BoardConfig, view.Givens);
    }

    [Fact]
    public void MaxMistakes_IsThreeForSudoku_OneForMinesweeper()
    {
        Assert.Equal(3, GameEngine.MaxMistakes(GameType.Sudoku));
        Assert.Equal(1, GameEngine.MaxMistakes(GameType.Minesweeper));
    }
}

public class MinesweeperTests
{
    [Theory]
    [InlineData(Difficulty.Easy, 9, 9, 10)]
    [InlineData(Difficulty.Medium, 16, 16, 40)]
    [InlineData(Difficulty.Hard, 16, 30, 99)]
    public void Generate_HasRightSizeAndMineCount(Difficulty d, int rows, int cols, int mines)
    {
        var p = GameEngine.Generate(GameType.Minesweeper, d, 42);
        Assert.Equal(rows * cols, p.Solution.Length);
        Assert.Equal(mines, p.Solution.Count(c => c == 'M'));
        Assert.Equal($"{rows}x{cols}x{mines}", p.BoardConfig);
    }

    [Fact]
    public void SameSeed_GivesSameMines_DifferentSeed_Differs()
    {
        var a = GameEngine.Generate(GameType.Minesweeper, Difficulty.Medium, 99);
        var b = GameEngine.Generate(GameType.Minesweeper, Difficulty.Medium, 99);
        var c = GameEngine.Generate(GameType.Minesweeper, Difficulty.Medium, 100);
        Assert.Equal(a.Solution, b.Solution);
        Assert.NotEqual(a.Solution, c.Solution);
    }

    [Theory]
    [InlineData(Difficulty.Easy)]
    [InlineData(Difficulty.Medium)]
    [InlineData(Difficulty.Hard)]
    public void CenterAndItsEightNeighbours_AreMineFree_AndOpenedAtStart(Difficulty d)
    {
        for (int seed = 0; seed < 50; seed++)
        {
            var p = GameEngine.Generate(GameType.Minesweeper, d, seed);
            var (rows, cols, _) = Minesweeper.ParseConfig(p.BoardConfig);
            int center = Minesweeper.CenterIndex(rows, cols);

            Assert.Equal('.', p.Solution[center]);
            foreach (int n in Minesweeper.Neighbors(center, rows, cols))
                Assert.Equal('.', p.Solution[n]);

            string state = GameEngine.InitialState(p);
            Assert.NotEqual('#', state[center]);
            Assert.DoesNotContain('*', state);
        }
    }

    [Fact]
    public void OpeningAMine_IsIncorrect_AndMarksTheCell()
    {
        var p = GameEngine.Generate(GameType.Minesweeper, Difficulty.Easy, 1);
        string state = GameEngine.InitialState(p);
        int mine = p.Solution.IndexOf('M');

        var outcome = GameEngine.Apply(p, state, mine, 0);

        Assert.NotNull(outcome);
        Assert.False(outcome!.Correct);
        Assert.False(outcome.Solved);
        Assert.Equal('*', outcome.State[mine]);
    }

    [Fact]
    public void Apply_AlreadyOpenedOrBadInput_ReturnsNull()
    {
        var p = GameEngine.Generate(GameType.Minesweeper, Difficulty.Easy, 1);
        string state = GameEngine.InitialState(p);
        int opened = state.IndexOf(state.First(c => c != '#'));

        Assert.Null(GameEngine.Apply(p, state, opened, 0)); // đã mở
        Assert.Null(GameEngine.Apply(p, state, -1, 0));
        Assert.Null(GameEngine.Apply(p, state, 81, 0));
        Assert.Null(GameEngine.Apply(p, state, state.IndexOf('#'), 1)); // value phải là 0
    }

    [Fact]
    public void OpeningAllSafeCells_Wins()
    {
        var p = GameEngine.Generate(GameType.Minesweeper, Difficulty.Hard, 7);
        string state = GameEngine.InitialState(p);

        MoveOutcome? last = null;
        for (int i = 0; i < state.Length; i++)
        {
            if (p.Solution[i] == 'M' || state[i] != '#') continue;
            last = GameEngine.Apply(p, state, i, 0);
            Assert.NotNull(last);
            Assert.True(last!.Correct);
            state = last.State;
        }

        Assert.True(Minesweeper.IsSolved(p, state));
        Assert.Equal(100, GameEngine.Progress(p, state));
    }

    [Fact]
    public void FloodFill_OpensConnectedZeros()
    {
        // Bàn 9x9 chỉ 10 mìn: mở ô giữa thường loang ra nhiều ô.
        var p = GameEngine.Generate(GameType.Minesweeper, Difficulty.Easy, 3);
        string state = GameEngine.InitialState(p);
        Assert.True(state.Count(c => c != '#') >= 1);
        Assert.True(GameEngine.Progress(p, state) > 0);
    }

    [Fact]
    public void View_HidesMines_UntilFinished()
    {
        var p = GameEngine.Generate(GameType.Minesweeper, Difficulty.Medium, 2);
        string state = GameEngine.InitialState(p);

        var playing = GameEngine.View(p, state, finished: false);
        Assert.DoesNotContain('*', playing.Cells);
        Assert.Equal(40, playing.Mines);
        Assert.Null(playing.Givens);

        var finished = GameEngine.View(p, state, finished: true);
        Assert.Equal(40, finished.Cells.Count(c => c == '*'));
    }
}
