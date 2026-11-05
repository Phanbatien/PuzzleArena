using PuzzleArena.DataAccess.Domain;

namespace PuzzleArena.DataAccess.Entities;

public class Tournament
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = ""; // luật / hình thức do admin viết thêm
    public GameType GameType { get; set; }
    public Difficulty Difficulty { get; set; }
    public TournamentStatus Status { get; set; } = TournamentStatus.Open;
    public DateTimeOffset StartsAt { get; set; } // giờ bắt đầu do admin đặt; đăng ký đóng lúc này
    public int BracketSize { get; set; } = 16;   // số suất tối đa của nhánh loại trực tiếp (4/8/16/32)
    public int RoundMinutes { get; set; } = 10;  // thời gian vòng loại và mỗi trận
    public DateTimeOffset CreatedAt { get; set; }

    // Vòng loại: chỉ có khi số người đăng ký > BracketSize.
    public int? QualifierPuzzleId { get; set; }
    public Puzzle? QualifierPuzzle { get; set; }
    public DateTimeOffset? QualifierStartedAt { get; set; }

    // Nhánh loại trực tiếp: vòng hiện tại (1 = vòng đầu) và giờ vòng đó bắt đầu (có thể ở tương lai khi đang nghỉ).
    public int CurrentRound { get; set; }
    public int RoundCount { get; set; }
    public DateTimeOffset? RoundStartsAt { get; set; }

    public string? ClosedNote { get; set; }
    public List<TournamentEntry> Entries { get; set; } = [];
    public List<TournamentMatch> Matches { get; set; } = [];
}
