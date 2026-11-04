using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Tournaments;

/// <summary>Các quy tắc thuần của nhánh loại trực tiếp (không đụng database).</summary>
public static class Bracket
{
    public static readonly int[] Sizes = [4, 8, 16, 32];

    public static int NextPowerOfTwo(int n)
    {
        var p = 2;
        while (p < n) p *= 2;
        return p;
    }

    /// <summary>
    /// Thứ tự hạt giống chuẩn (như tennis, cờ vua): cặp đấu vòng 1 là (order[0], order[1]), (order[2], order[3])...
    /// Hạt giống 1 và 2 chỉ gặp nhau ở chung kết; hạt giống cao luôn đứng trước nên suất miễn đấu rơi vào họ.
    /// 8 -> 1,8,4,5,2,7,3,6.
    /// </summary>
    public static int[] SeedOrder(int size)
    {
        var order = new List<int> { 1 };
        while (order.Count < size)
        {
            var total = order.Count * 2 + 1;
            order = order.SelectMany(s => new[] { s, total - s }).ToList();
        }
        return order.ToArray();
    }

    public static int RoundCount(int bracketPlayers) => (int)Math.Log2(NextPowerOfTwo(bracketPlayers));

    public static string RoundName(int round, int roundCount) => (roundCount - round) switch
    {
        0 => "Chung kết",
        1 => "Bán kết",
        2 => "Tứ kết",
        var left => $"Vòng 1/{1 << left}",
    };

    /// <summary>Hạng cuối của người bị loại ở vòng <paramref name="round"/>: chung kết -> 2, bán kết -> 3, tứ kết -> 5...</summary>
    public static int RankWhenEliminated(int round, int roundCount) => (1 << (roundCount - round)) + 1;

    /// <summary>
    /// Hết giờ mà chưa ai giải xong: tiến độ cao hơn thắng, rồi ít lỗi hơn, rồi hạt giống cao hơn (số nhỏ hơn).
    /// Trả về true nếu người 1 thắng, kèm lý do.
    /// </summary>
    public static (bool FirstWins, string Note) DecideOnTime(Attempt a1, int seed1, Attempt a2, int seed2)
    {
        if (a1.Progress != a2.Progress)
            return (a1.Progress > a2.Progress, "Hết giờ: tiến độ cao hơn");
        if (a1.Mistakes != a2.Mistakes)
            return (a1.Mistakes < a2.Mistakes, "Hết giờ: bằng tiến độ, ít lỗi hơn");
        return (seed1 < seed2, "Hết giờ: hòa, hạt giống cao hơn đi tiếp");
    }

    /// <summary>Kế hoạch theo số người: có vòng loại không, bao nhiêu người vào nhánh, mấy vòng, mấy suất miễn đấu.</summary>
    public static (bool Qualifier, int Players, int Rounds, int Byes) Plan(int registered, int bracketSize)
    {
        var players = Math.Max(2, Math.Min(registered, bracketSize));
        var size = NextPowerOfTwo(players);
        return (registered > bracketSize, players, RoundCount(players), size - players);
    }

    public static string Summary(int registered, int bracketSize, int roundMinutes, TournamentStatus status)
    {
        var (qualifier, players, rounds, byes) = Plan(registered, bracketSize);
        var parts = new List<string>();
        if (status == TournamentStatus.Open)
            parts.Add(registered < 2
                ? $"Cần ít nhất 2 người. Tối đa {bracketSize} người vào nhánh đấu; đông hơn thì có vòng loại"
                : $"Theo {registered} người đã đăng ký");
        if (registered >= 2 || status != TournamentStatus.Open)
        {
            if (qualifier)
                parts.Add($"vòng loại chung một đề ({roundMinutes} phút), top {bracketSize} vào nhánh đấu");
            parts.Add($"loại trực tiếp 1-1 gồm {rounds} vòng ({players} người"
                + (byes > 0 ? $", {byes} hạt giống cao được miễn vòng 1)" : ")"));
        }
        parts.Add($"mỗi trận {roundMinutes} phút, hai người cùng một đề: ai giải xong trước thắng, sai quá số lỗi hoặc trúng mìn là thua, hết giờ thì tiến độ cao hơn thắng");
        var text = string.Join("; ", parts) + ".";
        return char.ToUpper(text[0]) + text[1..];
    }
}
