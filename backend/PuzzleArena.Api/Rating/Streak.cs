namespace PuzzleArena.Api.Rating;

public static class Streak
{
    public static int Compute(IEnumerable<DateOnly> solvedDays, DateOnly today)
    {
        var days = solvedDays.ToHashSet();
        var cursor = days.Contains(today) ? today : today.AddDays(-1);
        if (!days.Contains(cursor))
            return 0;

        var streak = 0;
        while (days.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }
}
