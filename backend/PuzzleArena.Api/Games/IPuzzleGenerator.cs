using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Games;

public interface IPuzzleGenerator
{
    Puzzle Generate(GameType game, Difficulty difficulty, int seed);
}
