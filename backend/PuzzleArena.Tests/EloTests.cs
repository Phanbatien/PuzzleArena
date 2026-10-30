using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Tests;

public class EloTests
{
    [Fact]
    public void Hard_win_gains_more_than_easy_win_for_a_new_player()
    {
        var easy = Elo.Delta(Elo.Initial, Elo.PuzzleRating(Difficulty.Easy), won: true);
        var hard = Elo.Delta(Elo.Initial, Elo.PuzzleRating(Difficulty.Hard), won: true);
        Assert.True(hard > easy);
    }

    [Fact]
    public void Loss_lowers_rating()
    {
        var delta = Elo.Delta(Elo.Initial, Elo.PuzzleRating(Difficulty.Easy), won: false);
        Assert.True(delta < 0);
        Assert.True(Elo.Initial + delta < Elo.Initial);
    }

    [Fact]
    public void Same_inputs_return_the_same_delta()
    {
        var first = Elo.Delta(1000, 1700, won: true);
        var second = Elo.Delta(1000, 1700, won: true);
        Assert.Equal(first, second);
    }

    [Theory]
    [InlineData(1000, "Đồng", 1100, Difficulty.Easy)]
    [InlineData(1100, "Bạc", 1500, Difficulty.Medium)]
    [InlineData(1499, "Bạc", 1500, Difficulty.Medium)]
    [InlineData(1500, "Vàng", 1900, Difficulty.Hard)]
    [InlineData(1899, "Vàng", 1900, Difficulty.Hard)]
    [InlineData(1900, "Kim cương", null, Difficulty.Hard)]
    public void Rank_and_suggested_difficulty(int value, string rank, int? next, Difficulty suggested)
    {
        Assert.Equal(rank, Elo.RankName(value));
        Assert.Equal(next, Elo.NextMilestone(value));
        Assert.Equal(suggested, Elo.SuggestedDifficulty(value));
    }
}
