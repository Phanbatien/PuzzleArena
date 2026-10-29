using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Games;

// Bản thật thay cho StubPuzzleGenerator của BE1: IPuzzleGenerator -> GameEngine.
public sealed class GamePuzzleGenerator : IPuzzleGenerator
{
    public Puzzle Generate(GameType game, Difficulty difficulty, int seed)
        => GameEngine.Generate(game, difficulty, seed);
}
