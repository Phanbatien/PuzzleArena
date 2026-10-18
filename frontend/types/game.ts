import type {
  AttemptStatus,
  BoosterType,
  Difficulty,
  GameType,
} from "@/types/common";

// Một đề Daily. Frontend KHÔNG nhận đáp án (đáp án chỉ nằm ở server).
// BE1 đã xác nhận (2026-10-16): GET /api/daily?game=Sudoku (hoặc Minesweeper)
// trả mảng 3 đề Easy/Medium/Hard.
export type DailyPuzzle = {
  id: number; // id của Puzzle
  gameType: GameType;
  difficulty: Difficulty;
  dailyDate: string; // ngày của đề, ví dụ "2026-10-13"
  ratingIfSolved: number; // điểm cộng nếu giải được (backend tính cho đúng người đang gọi)
  ratingIfFailed: number; // điểm khi hỏng, là số ÂM, ví dụ -20 (backend tính)
  // "NotStarted" nằm NGOÀI enum AttemptStatus của TEAM-PLAN nên phải thêm vào đây.
  status: "NotStarted" | AttemptStatus;
  attemptId: number | null; // null nếu chưa chơi, có lượt chơi rồi thì có id
};

// GET /api/me/ratings trả mảng, mỗi game một phần tử (BE1 đã xác nhận).
// Hạng: dưới 1100 "Đồng", 1100-1499 "Bạc", 1500-1899 "Vàng", từ 1900 "Kim cương".
export type UserRating = {
  gameType: GameType;
  value: number; // điểm rating hiện tại
  rankName: string; // tên hạng
  nextMilestone: number | null; // điểm mốc lên hạng tiếp theo, null nếu đã ở hạng cao nhất
  suggestedDifficulty: Difficulty; // độ khó vừa sức
};

// GET /api/me/missions trả mảng nhiệm vụ (BE1 đã xác nhận).
// Quy tắc: 1 đề daily/ngày -> 1 Gợi ý, 5 đề/tuần -> 1 Khiên.
export type Mission = {
  id: "daily" | "weekly";
  period: "Daily" | "Weekly";
  title: string;
  progress: number; // đã làm được
  target: number; // cần làm
  completed: boolean;
  rewardType: BoosterType;
  rewardAmount: number;
  rewardClaimed: boolean; // phần thưởng chỉ trao một lần
};

// GET /api/boosters trả số lượng còn lại theo từng loại (BE1 đã xác nhận).
export type InventoryItem = {
  type: BoosterType;
  amount: number;
};

// POST /api/boosters/grant (chỉ Admin). Backend trả { type, amount }
// với amount là số còn lại SAU khi cộng.
export type GrantBoosterRequest = {
  userId: number;
  type: BoosterType;
  amount: number;
};

export type GrantBoosterResponse = {
  type: BoosterType;
  amount: number;
};

// GET /api/me/history trả mảng, mới nhất trước, chưa chơi thì [] (BE1 đã xác nhận).
export type PlayHistory = {
  attemptId: number;
  gameType: GameType;
  difficulty: Difficulty;
  startedAt: string; // chuỗi ngày giờ ISO
  durationMs: number | null; // null nếu chưa xong
  mistakes: number;
  status: AttemptStatus;
  ratingChange: number | null; // null nếu chưa chấm Elo
};