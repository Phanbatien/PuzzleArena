using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Entities;

/// <summary>
/// Một trận 1-1 của nhánh loại trực tiếp. Hai người giải CÙNG một đề (mỗi trận một đề riêng),
/// người thắng đi tiếp vào trận (Round + 1, Slot / 2).
/// </summary>
public class TournamentMatch
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    public int Round { get; set; }
    public int Slot { get; set; }
    public MatchStatus Status { get; set; } = MatchStatus.Pending;
    public int? Player1Id { get; set; }
    public User? Player1 { get; set; }
    public int? Player2Id { get; set; }
    public User? Player2 { get; set; }
    public int? Seed1 { get; set; }
    public int? Seed2 { get; set; }
    public int? PuzzleId { get; set; }
    public Puzzle? Puzzle { get; set; }
    public int? Attempt1Id { get; set; }
    public int? Attempt2Id { get; set; }
    // Phòng chờ: mỗi người bấm "Vào thi" là sẵn sàng; đủ cả hai mới bắt đầu (cùng một giờ cho cả hai).
    public DateTimeOffset? Ready1At { get; set; }
    public DateTimeOffset? Ready2At { get; set; }
    public int? WinnerId { get; set; }
    public string? Note { get; set; } // vì sao thắng: giải xong trước, đối thủ thua, hết giờ, miễn đấu
    public DateTimeOffset? StartedAt { get; set; } // giờ bắt đầu chung (sau đếm ngược); null = đang chờ hai người vào
    public DateTimeOffset? FinishedAt { get; set; }
}
