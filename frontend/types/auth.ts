import type { Role } from "@/types/common";

// Khớp hợp đồng: user: { id, username, role }
// GIẢ ĐỊNH cần xác nhận với BE1: kiểu của id là number (nếu backend dùng Guid thì đổi thành string).
export type User = {
  id: number;
  username: string;
  role: Role;
};

// Khớp hợp đồng: POST /api/auth/register và /login -> { token, user }
export type AuthResponse = {
  token: string;
  user: User;
};

// Dùng cho trang /admin/users.
// GIẢ ĐỊNH cần xác nhận với BE1: danh sách người dùng có thêm isLocked và createdAt
// (entity User có IsLocked, CreatedAt nhưng response của API admin chưa được chốt).
export type AdminUser = User & {
  isLocked: boolean;
  createdAt: string; // chuỗi ngày giờ ISO, ví dụ "2026-10-13T08:30:00Z"
};