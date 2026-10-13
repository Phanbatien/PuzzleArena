import type {
  AttemptStatus,
  BoosterType,
  Difficulty,
  GameType,
} from "@/types/common";

// Một đề Daily. Frontend KHÔNG nhận đáp án (đáp án chỉ nằm ở server).
// Đã chốt: mỗi game mỗi ngày có 3 đề Easy/Medium/Hard (GET /api/daily?game=Sudoku).
// GIẢ ĐỊNH cần xác nhận với BE1: tên và hình dạng các trường bên dưới.
export type DailyPuzzle = {
  id: number; // id của Puzzle
  gameType: GameType;
  difficulty: Difficulty;
  dailyDate: string; // ngày của đề, ví dụ "2026-10-13"
  ratingIfSolved: number; // điểm cộng nếu giải được (backend tính, GIẢ ĐỊNH)
  ratingIfFailed: number; // điểm trừ nếu hỏng, ví dụ -12 (backend tính, GIẢ ĐỊNH)
  status: "NotStarted" | AttemptStatus; // chưa chơi / đang chơi / đã xong (GIẢ ĐỊNH)
  attemptId: number | null; // có lượt chơi rồi thì có id để vào lại (GIẢ ĐỊNH)
};

// Entity UserRating có Id, UserId, GameType, Value (đã chốt).
// GIẢ ĐỊNH cần xác nhận với BE1: các trường rankName, nextMilestone, suggestedDifficulty.
export type UserRating = {
  gameType: GameType;
  value: number; // điểm rating hiện tại
  rankName: string | null; // tên hạng
  nextMilestone: number | null; // điểm của mốc lên hạng tiếp theo
  suggestedDifficulty: Difficulty | null; // độ khó vừa sức
};

// Nhiệm vụ ngày/tuần. Quy tắc đã chốt: 1 đề daily/ngày -> 1 Gợi ý, 5 đề/tuần -> 1 Khiên.
// GIẢ ĐỊNH cần xác nhận với BE1: toàn bộ hình dạng dữ liệu của API nhiệm vụ.
export type Mission = {
  id: string;
  period: "Daily" | "Weekly";
  title: string;
  progress: number; // đã làm được
  target: number; // cần làm
  completed: boolean;
  rewardType: BoosterType;
  rewardAmount: number;
  rewardClaimed: boolean; // phần thưởng chỉ trao một lần
};

// Kho bổ trợ: BoosterGrant có Type và Amount (+ nhận / - dùng) đã chốt.
// GIẢ ĐỊNH cần xác nhận với BE1: GET /api/boosters trả số lượng còn lại theo từng loại.
export type InventoryItem = {
  type: BoosterType;
  amount: number;
};

// Lịch sử chơi, lấy từ Attempt (StartedAt, DurationMs, Mistakes, Status đã chốt).
// GIẢ ĐỊNH cần xác nhận với BE1: API lịch sử và trường ratingChange.
export type PlayHistory = {
  attemptId: number;
  gameType: GameType;
  difficulty: Difficulty;
  startedAt: string; // chuỗi ngày giờ ISO
  durationMs: number | null; // null nếu chưa xong
  mistakes: number;
  status: AttemptStatus;
  ratingChange: number | null; // điểm tăng/giảm, null nếu chưa có
};

export type BoardView = {
  game: GameType;
  rows: number;
  cols: number;
  mines: number;
  cells: string;
  givens: string | null;
};