import { api } from "@/lib/api";
import { USE_MOCK } from "@/lib/config";
import { mockHistory, mockMe } from "@/mocks/profile";
import type { PlayHistory } from "@/types/game";
import type { MeProfile } from "@/types/profile";

// Chờ một chút để khi dùng mock vẫn thấy được màn hình "đang tải".
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET /api/me -> { id, username, role, streak }
export async function getMe(): Promise<MeProfile> {
  if (USE_MOCK) {
    await delay(400);
    return mockMe;
  }
  return api.get<MeProfile>("/api/me");
}

// GET /api/me/history -> mảng, mới nhất trước, chưa chơi thì []
export async function getHistory(): Promise<PlayHistory[]> {
  if (USE_MOCK) {
    await delay(400);
    return mockHistory;
  }
  return api.get<PlayHistory[]>("/api/me/history");
}