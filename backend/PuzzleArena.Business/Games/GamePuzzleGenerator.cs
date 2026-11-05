using PuzzleArena.DataAccess.Domain;
using PuzzleArena.DataAccess.Entities;

namespace PuzzleArena.Business.Games;

// IPuzzleGenerator (hợp đồng của BE1) -> GameEngine của BE2.
public sealed class GamePuzzleGenerator : IPuzzleGenerator
{
    public Puzzle Generate(GameType game, Difficulty difficulty, int seed)
        => GameEngine.Generate(game, difficulty, seed);
}
