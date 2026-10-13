// Các giá trị này đã chốt trong TEAM-PLAN.md mục 5.
// Backend gửi qua JSON dạng chuỗi, nên ở frontend ta dùng kiểu "union của chuỗi".

export type GameType = "Sudoku" | "Minesweeper";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Role = "Player" | "Admin";

export type AttemptStatus = "InProgress" | "Solved" | "Failed";

export type BoosterType = "Hint" | "Shield";

// Lỗi backend trả về theo hợp đồng nhóm: { "error": "thông báo tiếng Việt" }
export type ApiErrorBody = {
  error: string;
};