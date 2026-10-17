"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import type { AuthResponse, User } from "@/types/auth";
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  saveSession,
} from "@/lib/auth";
import { setUnauthorizedHandler } from "@/lib/api";

// ---- Phần "nguồn dữ liệu" là localStorage ----
// useSyncExternalStore là cách React đọc dữ liệu nằm ngoài React (ở đây là localStorage).
// Nó cần 3 thứ: cách đăng ký nghe thay đổi (subscribe), cách đọc giá trị (getSnapshot),
// và giá trị dùng khi chạy trên server (getServerSnapshot).

const listeners = new Set<() => void>();

// Đăng ký nghe thay đổi: trong cùng tab (qua notify) và từ tab khác (sự kiện "storage").
function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

// Báo cho tất cả nơi đang nghe: "phiên đăng nhập vừa thay đổi, đọc lại đi".
function notify(): void {
  listeners.forEach((listener) => listener());
}

// getSnapshot phải trả về CÙNG một object nếu dữ liệu không đổi,
// nếu không React sẽ tưởng dữ liệu luôn thay đổi và render lặp vô hạn.
// Vì vậy ta nhớ lại kết quả lần trước (cachedUser) và chỉ đổi khi nội dung thật sự khác.
let cachedKey = "";
let cachedUser: User | null = null;

function getSnapshot(): User | null {
  // Không có token thì coi như chưa đăng nhập, dù còn sót thông tin user.
  const token = getStoredToken();
  const user = token ? getStoredUser() : null;
  const key = user ? JSON.stringify(user) : "";
  if (key !== cachedKey) {
    cachedKey = key;
    cachedUser = user;
  }
  return cachedUser;
}

// Trên server không có localStorage nên luôn là "chưa đăng nhập".
function getServerSnapshot(): User | null {
  return null;
}

// Dùng để biết trình duyệt đã tải xong chưa (server: false, trình duyệt: true).
function subscribeNothing(): () => void {
  return () => {};
}

// ---- Context ----

type AuthContextValue = {
  user: User | null;
  isReady: boolean; // false trong lúc chưa đọc xong phiên đăng nhập, tránh nháy giao diện
  login: (auth: AuthResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isReady = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  const login = useCallback((auth: AuthResponse) => {
    saveSession(auth);
    notify();
  }, []);

  const logout = useCallback(() => {
    clearSession();
    notify();
  }, []);

  // Đăng ký với lib/api.ts: khi API trả 401 (token hết hạn) thì xóa phiên đăng nhập.
  // user thành null, RequireAuth sẽ tự chuyển về /login.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo(
    () => ({ user, isReady, login, logout }),
    [user, isReady, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Cách dùng trong component: const { user, login, logout } = useAuth();
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được dùng bên trong <AuthProvider>.");
  }
  return context;
}
