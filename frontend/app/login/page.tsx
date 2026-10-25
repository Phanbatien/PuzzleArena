"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearAuth, login, register, saveAuth, useAuthToken, useCurrentUser } from "@/src/lib/api/auth";
import { ApiError } from "@/src/lib/api/client";
import type { AuthUser, Role } from "@/src/lib/api/types";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "directToken">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [manualRole, setManualRole] = useState<Role>("Player");

  const currentToken = useAuthToken();
  const currentUser = useCurrentUser();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === "login") {
        const res = await login({ username, password });
        setSuccessMessage(`Đăng nhập thành công với tài khoản ${res.user.username} (${res.user.role})!`);
      } else {
        const res = await register({ username, password });
        setSuccessMessage(`Đăng ký thành công với tài khoản ${res.user.username} (${res.user.role})!`);
      }
      setTimeout(() => router.push("/"), 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || `Lỗi đăng nhập/đăng ký (mã ${err.status}).`);
      } else {
        setErrorMessage("Không thể kết nối đến máy chủ xác thực.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveManualToken = (e: React.FormEvent) => {
    e.preventDefault();
    const token = manualToken.trim();
    if (!token) return;

    const mockUser: AuthUser = {
      id: 999,
      username: username.trim() || (manualRole === "Admin" ? "admin_dev" : "player_dev"),
      role: manualRole,
    };
    saveAuth(token, mockUser);
    setSuccessMessage(`Đã lưu token thành công với role ${manualRole}!`);
  };

  const handleLogout = () => {
    clearAuth();
    setSuccessMessage("Đã đăng xuất tài khoản.");
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <header className="text-center">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-widest text-brand-700 hover:underline"
          >
            ← PuzzleArena
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Tài khoản & Xác thực</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Đăng nhập để lưu tiến độ, xếp hạng rating và quản lý các lượt chơi
          </p>
        </header>

        {/* Current Auth Status Card */}
        {currentToken ? (
          <div className="w-full rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Đã đăng nhập
                </span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {currentUser?.role ?? "Player"}
              </span>
            </div>

            <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              <p>
                Người dùng: <strong>{currentUser?.username ?? "Chưa rõ"}</strong>
              </p>
              <p className="mt-1 font-mono truncate text-[11px] text-slate-500">
                Token: {currentToken.slice(0, 16)}...{currentToken.slice(-10)}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Đăng xuất
              </button>
              <Link
                href="/practice"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                Vào chơi ngay →
              </Link>
            </div>
          </div>
        ) : null}

        {/* Feedback message */}
        {successMessage && (
          <div
            role="status"
            className="w-full rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
          >
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div
            role="alert"
            className="w-full rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
          >
            {errorMessage}
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="grid w-full grid-cols-3 rounded-xl border border-slate-200 bg-white p-1 text-center text-xs font-bold shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg py-2 transition-all ${
              mode === "login"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-lg py-2 transition-all ${
              mode === "register"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Đăng ký
          </button>
          <button
            type="button"
            onClick={() => setMode("directToken")}
            className={`rounded-lg py-2 transition-all ${
              mode === "directToken"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Dev Token
          </button>
        </div>

        {/* Auth Forms */}
        {mode !== "directToken" ? (
          <form
            onSubmit={handleAuthSubmit}
            className="w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <label
                htmlFor="usernameInput"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Tên đăng nhập (Username)
              </label>
              <input
                id="usernameInput"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Ví dụ: player1"
              />
            </div>

            <div>
              <label
                htmlFor="passwordInput"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Mật khẩu
              </label>
              <input
                id="passwordInput"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-6 font-bold text-white shadow transition-all hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {isLoading
                ? "Đang xử lý…"
                : mode === "login"
                ? "Đăng nhập"
                : "Đăng ký tài khoản"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleSaveManualToken}
            className="w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <label
                htmlFor="directTokenInput"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Nhập JWT Token trực tiếp (Dành cho Dev/Test)
              </label>
              <textarea
                id="directTokenInput"
                required
                rows={3}
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Dán mã Bearer JWT token từ backend hoặc Swagger vào đây..."
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Role gán cho token:
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualRole("Player")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    manualRole === "Player"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                  }`}
                >
                  Player
                </button>
                <button
                  type="button"
                  onClick={() => setManualRole("Admin")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    manualRole === "Admin"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-6 font-bold text-white shadow transition-all hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Lưu token vào LocalStorage
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
