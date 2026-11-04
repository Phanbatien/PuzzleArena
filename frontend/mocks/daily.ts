import type {
  DailyPuzzle,
  InventoryItem,
  Mission,
  UserRating,
} from "@/types/game";

// DỮ LIỆU GIẢ, chỉ dùng khi NEXT_PUBLIC_USE_MOCK=true.
// Khi có backend thật, các số liệu này sẽ được thay bằng dữ liệu từ API.
// Các con số ratingIfSolved/ratingIfFailed bên dưới chỉ là số ví dụ cho giao diện,
// KHÔNG phải công thức. Backend mới là nơi tính điểm Elo.

// 3 thẻ Sudoku (Dễ / Vừa / Khó): có thẻ đã chơi, có thẻ đang dở, để thử giao diện.
export const mockDailySudoku: DailyPuzzle[] = [
  {
    gameType: "Sudoku",
    difficulty: "Easy",
    dailyDate: "2026-10-17",
    ratingIfSolved: 12,
    ratingIfFailed: -20,
    status: "NotStarted",
    attemptId: null,
    playedToday: 3,
    solvedToday: 2,
  },
  {
    gameType: "Sudoku",
    difficulty: "Medium",
    dailyDate: "2026-10-17",
    ratingIfSolved: 27,
    ratingIfFailed: -5,
    status: "InProgress",
    attemptId: 102,
    playedToday: 0,
    solvedToday: 0,
  },
  {
    gameType: "Sudoku",
    difficulty: "Hard",
    dailyDate: "2026-10-17",
    ratingIfSolved: 31,
    ratingIfFailed: -1,
    status: "NotStarted",
    attemptId: null,
    playedToday: 0,
    solvedToday: 0,
  },
];

// 3 thẻ Dò mìn: chưa chơi ván nào hôm nay.
export const mockDailyMinesweeper: DailyPuzzle[] = [
  {
    gameType: "Minesweeper",
    difficulty: "Easy",
    dailyDate: "2026-10-17",
    ratingIfSolved: 6,
    ratingIfFailed: -26,
    status: "NotStarted",
    attemptId: null,
    playedToday: 0,
    solvedToday: 0,
  },
  {
    gameType: "Minesweeper",
    difficulty: "Medium",
    dailyDate: "2026-10-17",
    ratingIfSolved: 22,
    ratingIfFailed: -10,
    status: "NotStarted",
    attemptId: null,
    playedToday: 0,
    solvedToday: 0,
  },
  {
    gameType: "Minesweeper",
    difficulty: "Hard",
    dailyDate: "2026-10-17",
    ratingIfSolved: 31,
    ratingIfFailed: -1,
    status: "NotStarted",
    attemptId: null,
    playedToday: 0,
    solvedToday: 0,
  },
];

// Rating: Sudoku hạng Đồng, Dò mìn hạng Bạc để thử cả hai kiểu hiển thị.
export const mockRatings: UserRating[] = [
  {
    gameType: "Sudoku",
    value: 1000,
    rankName: "Đồng",
    nextMilestone: 1100,
    suggestedDifficulty: "Easy",
  },
  {
    gameType: "Minesweeper",
    value: 1150,
    rankName: "Bạc",
    nextMilestone: 1500,
    suggestedDifficulty: "Medium",
  },
];

// Nhiệm vụ: ngày đã xong và đã nhận thưởng, tuần mới được 2/5.
export const mockMissions: Mission[] = [
  {
    id: "daily",
    period: "Daily",
    title: "Giải 1 đề Daily trong ngày",
    progress: 1,
    target: 1,
    completed: true,
    rewardType: "Hint",
    rewardAmount: 1,
    rewardClaimed: true,
  },
  {
    id: "weekly",
    period: "Weekly",
    title: "Giải 5 đề Daily trong tuần",
    progress: 2,
    target: 5,
    completed: false,
    rewardType: "Shield",
    rewardAmount: 1,
    rewardClaimed: false,
  },
];

// Kho bổ trợ: có 2 Gợi ý, chưa có Khiên.
export const mockInventory: InventoryItem[] = [
  { type: "Hint", amount: 2 },
  { type: "Shield", amount: 0 },
];