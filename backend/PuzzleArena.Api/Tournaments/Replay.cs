using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;

namespace PuzzleArena.Api.Tournaments;

/// <summary>
/// Dựng lại bàn chơi của một lượt tại một thời điểm trong quá khứ, bằng cách phát lại MoveLog
/// ("elapsedMs|index|value|K" do AttemptService của BE2 ghi). Khán giả xem bàn chơi trễ 30 giây
/// nhờ cách này, không cần lưu thêm ảnh chụp bàn nào.
/// </summary>
public static class Replay
{
    public static PlayerBoard At(Attempt a, Puzzle puzzle, string username, int? seed, DateTimeOffset asOf)
    {
        var state = GameEngine.InitialState(puzzle);
        int mistakes = 0;
        var cutoffMs = (asOf - a.StartedAt).TotalMilliseconds;

        foreach (var line in a.MoveLog.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var f = line.Split('|');
            if (f.Length != 4 || !long.TryParse(f[0], out var elapsed) || elapsed > cutoffMs) continue;
            if (!int.TryParse(f[1], out var index) || !int.TryParse(f[2], out var value)) continue;
            var kind = f[3];
            if (kind == "V") continue; // admin hủy kết quả, không phải nước đi

            var outcome = GameEngine.Apply(puzzle, state, index, value);
            if (outcome is null) continue;
            if (kind == "W") mistakes++;
            // Giống AttemptService: nước đúng thì ghi vào bàn; Dò mìn trúng mìn cũng lộ ô mìn đó.
            if (kind is "C" or "H" || puzzle.GameType == GameType.Minesweeper) // H = Gợi ý (luôn là ô đúng)
                state = outcome.State;
        }

        bool finished = a.FinishedAt is { } at && at <= asOf;
        var status = finished ? a.Status : AttemptStatus.InProgress;
        var progress = finished && a.Status == AttemptStatus.Solved ? 100 : GameEngine.Progress(puzzle, state);
        return new PlayerBoard(a.UserId, username, seed, progress, mistakes, status, GameEngine.View(puzzle, state, finished));
    }
}
