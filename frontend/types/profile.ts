import type { Role } from "@/types/common";

// GET /api/me (BE1 đã xác nhận 2026-10-16): { id, username, role, streak }
export type MeProfile = {
  id: number;
  username: string;
  role: Role;
  streak: number; // số ngày chơi liên tục, do backend tính
};