import type { PlayHistory } from "@/types/game";
import type { MeProfile } from "@/types/profile";

// DỮ LIỆU GIẢ, chỉ dùng khi NEXT_PUBLIC_USE_MOCK=true.
// Lưu ý: mock luôn trả player1, không theo tài khoản đang đăng nhập.
// Khi dùng API thật, GET /api/me trả đúng người đang đăng nhập.
export const mockMe: MeProfile = {
  id: 2,
  username: "player1",
  role: "Player",
  streak: 3,
};

// Lịch sử giả, mới nhất trước. Có đủ: thắng, thua, đang chơi (chưa có thời gian/điểm).
export const mockHistory: PlayHistory[] = [
  {
    attemptId: 102,
    gameType: "Sudoku",
    difficulty: "Medium",
    startedAt: "2026-10-17T07:30:00Z",
    durationMs: null,
    mistakes: 1,
    status: "InProgress",
    ratingChange: null,
  },
  {
    attemptId: 101,
    gameType: "Sudoku",
    difficulty: "Easy",
    startedAt: "2026-10-17T06:10:00Z",
    durationMs: 245000,
    mistakes: 0,
    status: "Solved",
    ratingChange: 12,
  },
  {
    attemptId: 98,
    gameType: "Minesweeper",
    difficulty: "Medium",
    startedAt: "2026-10-16T13:45:00Z",
    durationMs: 98000,
    mistakes: 1,
    status: "Failed",
    ratingChange: -10,
  },
  {
    attemptId: 95,
    gameType: "Minesweeper",
    difficulty: "Easy",
    startedAt: "2026-10-15T09:20:00Z",
    durationMs: 61000,
    mistakes: 0,
    status: "Solved",
    ratingChange: 6,
  },
];