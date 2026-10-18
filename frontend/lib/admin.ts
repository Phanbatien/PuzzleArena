import { api } from "@/lib/api";
import { USE_MOCK } from "@/lib/config";
import { mockAdminUsers } from "@/mocks/admin";
import type { AdminUser } from "@/types/auth";
import type { Role } from "@/types/common";

// Chờ một chút để khi dùng mock vẫn thấy được màn hình "đang tải".
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// CHỈ DÙNG CHO MOCK: một bản sao danh sách để thao tác khóa/đổi vai trò
// có tác dụng trong lúc trang đang mở. Tải lại trang (F5) là trở về ban đầu.
// Khi dùng API thật, dữ liệu nằm ở backend nên đoạn này không được dùng.
let mockUsers: AdminUser[] = mockAdminUsers.map((u) => ({ ...u }));

function updateMockUser(id: number, changes: Partial<AdminUser>): AdminUser {
  const index = mockUsers.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new Error("Không tìm thấy người dùng (mock).");
  }
  mockUsers = mockUsers.map((u) => (u.id === id ? { ...u, ...changes } : u));
  return { ...mockUsers[index], ...changes };
}

// GET /api/admin/users (chỉ Admin) -> mảng user có thêm isLocked, createdAt.
// Không phải admin thì backend trả 403, hàm này sẽ ném ApiError.
export async function getUsers(): Promise<AdminUser[]> {
  if (USE_MOCK) {
    await delay(400);
    return mockUsers.map((u) => ({ ...u }));
  }
  return api.get<AdminUser[]>("/api/admin/users");
}

// PATCH /api/admin/users/{id}/status body { isLocked } -> một user như trong list
export async function setUserLocked(
  id: number,
  isLocked: boolean,
): Promise<AdminUser> {
  if (USE_MOCK) {
    await delay(400);
    return updateMockUser(id, { isLocked });
  }
  return api.patch<AdminUser>(`/api/admin/users/${id}/status`, { isLocked });
}

// PATCH /api/admin/users/{id}/role body { role: "Admin" | "Player" } -> một user
export async function setUserRole(id: number, role: Role): Promise<AdminUser> {
  if (USE_MOCK) {
    await delay(400);
    return updateMockUser(id, { role });
  }
  return api.patch<AdminUser>(`/api/admin/users/${id}/role`, { role });
}