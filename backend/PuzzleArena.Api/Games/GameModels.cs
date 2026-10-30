using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Games;

/// <summary>Kết quả một nước đi. Correct=false: Sudoku là điền sai, Dò mìn là trúng mìn.</summary>
public record MoveOutcome(string State, bool Correct, bool Solved);

/// <summary>Dữ liệu bàn gửi client. Không chứa đáp án / vị trí mìn khi ván chưa kết thúc.</summary>
public record BoardView(GameType Game, int Rows, int Cols, int Mines, string Cells, string? Givens);
