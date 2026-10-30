using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Rating;

public static class Elo
{
    public const int K = 32;
    public const int Initial = 1000;

    public static int PuzzleRating(Difficulty difficulty) => difficulty switch
    {
        Difficulty.Easy => 900,
        Difficulty.Medium => 1300,
        Difficulty.Hard => 1700,
        _ => Initial,
    };

    public static int Delta(int player, int puzzle, bool won)
    {
        var expected = 1.0 / (1.0 + Math.Pow(10, (puzzle - player) / 400.0));
        var score = won ? 1.0 : 0.0;
        return (int)Math.Round(K * (score - expected), MidpointRounding.AwayFromZero);
    }

    public static string RankName(int value) => value switch
    {
        < 1100 => "Đồng",
        < 1500 => "Bạc",
        < 1900 => "Vàng",
        _ => "Kim cương",
    };

    public static int? NextMilestone(int value) => value switch
    {
        < 1100 => 1100,
        < 1500 => 1500,
        < 1900 => 1900,
        _ => null,
    };

    // Midpoints between 900 / 1300 / 1700 are 1100 and 1500. A tie picks the higher difficulty.
    public static Difficulty SuggestedDifficulty(int value)
    {
        if (value < 1100) return Difficulty.Easy;
        if (value < 1500) return Difficulty.Medium;
        return Difficulty.Hard;
    }
}
