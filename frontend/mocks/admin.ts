import type { AdminUser } from "@/types/auth";

// Dữ liệu GIẢ để làm giao diện khi backend chưa chạy.
// Chỉ id của admin (1) là đúng hợp đồng BE1; id các player trong mock chỉ là ví dụ.
export const mockAdminUsers: AdminUser[] = [
  {
    id: 1,
    username: "admin",
    role: "Admin",
    isLocked: false,
    createdAt: "2026-10-01T08:00:00Z",
  },
  {
    id: 2,
    username: "player1",
    role: "Player",
    isLocked: false,
    createdAt: "2026-10-01T08:05:00Z",
  },
  {
    id: 3,
    username: "player2",
    role: "Player",
    isLocked: false,
    createdAt: "2026-10-02T09:30:00Z",
  },
  {
    id: 4,
    username: "player3",
    role: "Player",
    isLocked: true,
    createdAt: "2026-10-03T10:15:00Z",
  },
];