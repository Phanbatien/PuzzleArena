import { api } from "@/lib/api";
import { USE_MOCK } from "@/lib/config";
import { mockAdminUsers } from "@/mocks/admin";
import {
  mockDailyMinesweeper,
  mockDailySudoku,
  mockInventory,
  mockMissions,
  mockRatings,
} from "@/mocks/daily";
import type { AdminUser } from "@/types/auth";
import type { GameType } from "@/types/common";
import type {
  DailyPuzzle,
  GrantBoosterRequest,
  GrantBoosterResponse,
  InventoryItem,
  Mission,
  UserRating,
} from "@/types/game";

// Chờ một chút để khi dùng mock vẫn thấy được màn hình "đang tải".
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET /api/daily?game=Sudoku (hoặc Minesweeper) -> mảng 3 đề Easy/Medium/Hard
export async function getDaily(game: GameType): Promise<DailyPuzzle[]> {
  if (USE_MOCK) {
    await delay(400);
    return game === "Sudoku" ? mockDailySudoku : mockDailyMinesweeper;
  }
  return api.get<DailyPuzzle[]>(`/api/daily?game=${game}`);
}

// GET /api/me/ratings -> rating của từng game
export async function getRatings(): Promise<UserRating[]> {
  if (USE_MOCK) {
    await delay(400);
    return mockRatings;
  }
  return api.get<UserRating[]>("/api/me/ratings");
}

// GET /api/me/missions -> nhiệm vụ ngày và tuần
export async function getMissions(): Promise<Mission[]> {
  if (USE_MOCK) {
    await delay(400);
    return mockMissions;
  }
  return api.get<Mission[]>("/api/me/missions");
}

// GET /api/boosters -> số lượng Gợi ý và Khiên còn lại
export async function getBoosters(): Promise<InventoryItem[]> {
  if (USE_MOCK) {
    await delay(400);
    return mockInventory;
  }
  return api.get<InventoryItem[]>("/api/boosters");
}

// GET /api/admin/users (chỉ Admin) -> danh sách người dùng.
// Dùng để chọn người nhận trong form trao bổ trợ.
// Không phải admin thì backend trả 403, hàm này sẽ ném ApiError.
export async function getAdminUsers(): Promise<AdminUser[]> {
  if (USE_MOCK) {
    await delay(400);
    return mockAdminUsers;
  }
  return api.get<AdminUser[]>("/api/admin/users");
}

// POST /api/boosters/grant (chỉ Admin) body { userId, type, amount }
// -> { type, amount }, trong đó amount là số còn lại SAU khi cộng.
export async function grantBooster(
  request: GrantBoosterRequest,
): Promise<GrantBoosterResponse> {
  if (USE_MOCK) {
    await delay(400);
    // LƯU Ý (chỉ đúng với mock): mock KHÔNG dùng request.userId và KHÔNG lưu gì.
    // Nó lấy số trong mockInventory (kho của người đang đăng nhập, không phải
    // của người nhận) rồi cộng thêm request.amount. Vì vậy số "Hiện người này
    // có ..." trong form có thể không khớp với thẻ "Kho bổ trợ" ở trang /daily.
    // Khi dùng API thật, backend trả số còn lại sau khi cộng (GIẢ ĐỊNH: của
    // người nhận, cần BE1 xác nhận) nên số này sẽ đúng.
    const current = mockInventory.find((item) => item.type === request.type);
    const base = current ? current.amount : 0;
    return { type: request.type, amount: base + request.amount };
  }
  return api.post<GrantBoosterResponse>("/api/boosters/grant", request);
}