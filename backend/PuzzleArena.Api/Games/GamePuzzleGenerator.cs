using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Games;

// IPuzzleGenerator (hợp đồng của BE1) -> GameEngine của BE2.
public sealed class GamePuzzleGenerator : IPuzzleGenerator
{
    public Puzzle Generate(GameType game, Difficulty difficulty, int seed)
        => GameEngine.Generate(game, difficulty, seed);
}
