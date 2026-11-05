using PuzzleArena.DataAccess.Domain;
using PuzzleArena.DataAccess.Entities;

namespace PuzzleArena.Business.Games;

public interface IPuzzleGenerator
{
    Puzzle Generate(GameType game, Difficulty difficulty, int seed);
}
