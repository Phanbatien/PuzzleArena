"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, formatApiError } from "@/src/lib/api/client";
import { useSuspiciousAttempts, useVoidAttempt } from "@/src/lib/api/hooks";
import type { Game, SuspiciousAttemptResponse } from "@/src/lib/api/types";

function formatMs(ms: number | null): string {
  if (ms === null) return "--";
  if (ms < 1000) return `${ms}ms`;
  const sec = (ms / 1000).toFixed(1);
  return `${sec}s`;
}

function getVoidErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return "Chỉ có thể hủy những lượt chơi đã giải xong (Solved).";
      case 401:
      case 403:
        return "Bạn không có quyền quản trị viên (Admin) để thực hiện thao tác này.";
      case 404:
        return "Không tìm thấy lượt chơi tương ứng trên hệ thống.";
      default:
        return error.message || `Lỗi khi hủy lượt (mã ${error.status}).`;
    }
  }
  return "Không thể kết nối đến máy chủ quản trị.";
}

export default function AdminPage() {
  const [selectedGame, setSelectedGame] = useState<Game | undefined>(undefined);
  const [limit, setLimit] = useState<number>(50);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: suspiciousList, isLoading, isError, error, refetch } = useSuspiciousAttempts(selectedGame, limit);
  const voidMutation = useVoidAttempt();

  const handleVoid = async (attempt: SuspiciousAttemptResponse) => {
    const confirmed = window.confirm(
      `Xác nhận hủy kết quả lượt chơi #${attempt.attemptId} của người chơi "${attempt.username}"?`
    );
    if (!confirmed) return;

    setActionMessage(null);
    try {
      await voidMutation.mutateAsync(attempt.attemptId);
      setActionMessage({
        type: "success",
        text: `Đã hủy thành công lượt chơi #${attempt.attemptId}. Điểm rating đã được hoàn trả và trạng thái chuyển sang Failed.`,
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: getVoidErrorMessage(err),
      });
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="text-xs font-semibold uppercase tracking-widest text-brand-700 hover:underline"
              >
                ← PuzzleArena
              </Link>
              <span className="text-xs text-slate-400">/</span>
              <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold uppercase text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                Admin
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              Giám sát gian lận (Anti-Cheat)
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Phát hiện các lượt giải bất thường theo thời gian, số nước đi và thuật toán phát hiện gian lận.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isLoading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              🔄 Làm mới
            </button>
            <Link
              href="/login"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
            >
              Tài khoản / Token
            </Link>
          </div>
        </header>

        {/* Action feedback message */}
        {actionMessage && (
          <div
            role="status"
            className={`rounded-xl border p-4 text-sm font-medium ${
              actionMessage.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                : "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Filter Toolbar */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Trò chơi:</span>
            <button
              type="button"
              onClick={() => setSelectedGame(undefined)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedGame === undefined
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setSelectedGame("Sudoku")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedGame === "Sudoku"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              🔢 Sudoku
            </button>
            <button
              type="button"
              onClick={() => setSelectedGame("Minesweeper")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedGame === "Minesweeper"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              💣 Dò mìn
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="limitSelect" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Giới hạn:
            </label>
            <select
              id="limitSelect"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
            >
              <option value={20}>20 lượt</option>
              <option value={50}>50 lượt</option>
              <option value={100}>100 lượt</option>
            </select>
          </div>
        </section>

        {/* Content Table / States */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-2xl animate-spin">⏳</span>
            <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
              Đang tải danh sách lượt chơi nghi vấn từ máy chủ…
            </p>
          </div>
        )}

        {isError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
          >
            <p className="font-bold">Không thể tải danh sách nghi vấn:</p>
            <p className="mt-1 text-sm">{formatApiError(error)}</p>
            <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">
              Gợi ý: Đảm bảo bạn đã đăng nhập tài khoản có quyền Admin tại trang /login.
            </p>
          </div>
        )}

        {!isLoading && !isError && (!suspiciousList || suspiciousList.length === 0) && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-4xl">🛡️</span>
            <p className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">
              Không phát hiện lượt chơi nghi vấn
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Toàn bộ các lượt giải gần đây đều nằm trong ngưỡng an toàn hoặc bộ lọc chưa có dữ liệu.
            </p>
          </div>
        )}

        {!isLoading && !isError && suspiciousList && suspiciousList.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="py-3 px-4">Lượt (#ID)</th>
                  <th className="py-3 px-4">Người chơi</th>
                  <th className="py-3 px-4">Trò chơi</th>
                  <th className="py-3 px-4">Thời gian giải</th>
                  <th className="py-3 px-4">Nước / Lỗi</th>
                  <th className="py-3 px-4">Lý do nghi vấn</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {suspiciousList.map((item) => (
                  <tr key={item.attemptId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      #{item.attemptId}
                      {item.tournamentId && (
                        <span className="ml-1 text-xs font-normal text-amber-600 dark:text-amber-400">
                          (Giải #{item.tournamentId})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.username}
                      </span>
                      <span className="ml-1 text-xs text-slate-400">
                        (UID: {item.userId})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-medium">
                        {item.game === "Sudoku" ? "🔢 Sudoku" : "💣 Dò mìn"}
                      </span>
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {item.difficulty}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatMs(item.durationMs)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                      <div>Nước đi: <strong>{item.moves}</strong></div>
                      <div>Lỗi: <strong>{item.mistakes}</strong></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {item.reasons.map((r, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-300"
                          >
                            ⚠️ {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={voidMutation.isPending}
                        onClick={() => void handleVoid(item)}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-rose-700 disabled:opacity-50"
                      >
                        {voidMutation.isPending ? "Đang hủy…" : "Hủy lượt (Void)"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
