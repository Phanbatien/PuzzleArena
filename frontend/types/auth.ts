import type { Role } from "@/types/common";

// BE1 đã xác nhận: user: { id, username, role }, id là number.
export type User = {
  id: number;
  username: string;
  role: Role;
};

// BE1 đã xác nhận: POST /api/auth/register, /login và /dev-login đều trả { token, user }.
export type AuthResponse = {
  token: string;
  user: User;
};

// BE1 đã xác nhận: POST /api/auth/login chỉ cần { username, password }.
export type LoginRequest = {
  username: string;
  password: string;
};

// BE1 đã xác nhận: POST /api/auth/register cần { username, email, password }, email là bắt buộc.
export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
};

// Dùng cho trang /admin/users.
// BE1 đã xác nhận: GET /api/admin/users (chỉ Admin) trả User kèm isLocked và createdAt.
export type AdminUser = User & {
  isLocked: boolean;
  createdAt: string; // chuỗi ngày giờ ISO, ví dụ "2026-10-13T08:30:00Z"
};