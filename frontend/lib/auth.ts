import type { AuthResponse, User } from "@/types/auth";
import { TOKEN_KEY } from "@/lib/api";

// Khóa lưu thông tin người dùng (để hiện tên ngay khi tải lại trang).
// Khóa lưu token là TOKEN_KEY, khai báo trong lib/api.ts.
export const USER_KEY = "puzzlearena_user";

// Kiểm tra dữ liệu đọc từ localStorage có đúng hình dạng User không.
// Lý do: ai cũng có thể sửa localStorage bằng DevTools, nên không được tin mù quáng.
// GIẢ ĐỊNH cần xác nhận với BE1: id là number (nếu backend dùng Guid thì đổi cả ở đây và types/auth.ts).
function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    typeof v.username === "string" &&
    (v.role === "Player" || v.role === "Admin")
  );
}

// Lưu phiên đăng nhập sau khi login/register thành công.
export function saveSession(auth: AuthResponse): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, auth.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  } catch {
    // Trình duyệt chặn lưu trữ (chế độ riêng tư...): bỏ qua, người dùng chỉ phải đăng nhập lại.
  }
}

// Đọc token đã lưu. Trả về null nếu chưa đăng nhập.
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Đọc thông tin người dùng đã lưu. Trả về null nếu không có hoặc dữ liệu hỏng.
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Xóa phiên đăng nhập (dùng khi đăng xuất hoặc token hết hạn).
export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // bỏ qua
  }
}