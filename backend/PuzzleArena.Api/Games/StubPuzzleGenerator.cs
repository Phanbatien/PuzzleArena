using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Games;

// Stand-in until BE2's GameEngine.Generate is merged. Solution stays on the server.
public sealed class StubPuzzleGenerator : IPuzzleGenerator
{
    public Puzzle Generate(GameType game, Difficulty difficulty, int seed)
    {
        var cells = game == GameType.Sudoku ? 81 : 16;
        return new Puzzle
        {
            GameType = game,
            Difficulty = difficulty,
            Seed = seed,
            BoardConfig = new string('0', cells),
            Solution = $"stub|{game}|{difficulty}|{seed}",
        };
    }
}
