"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/src/lib/api/client";
import { useStartDaily } from "@/src/lib/api/hooks";

function getDailyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return "Đề daily này không phải của hôm nay hoặc đã hết hạn.";
      case 401:
        return "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.";
      case 404:
        return "Không tìm thấy đề daily tương ứng.";
      default:
        return error.message || `Đã xảy ra lỗi khi khởi tạo lượt daily (mã ${error.status}).`;
    }
  }
  return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.";
}

export default function DailyPage() {
  const router = useRouter();
  const startDaily = useStartDaily();
  const [puzzleId, setPuzzleId] = useState<string>("1");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(puzzleId.trim(), 10);
    if (isNaN(id) || id <= 0) return;

    try {
      const attempt = await startDaily.mutateAsync(id);
      // BE2 xác nhận: POST /api/daily/{puzzleId}/start trả về 200 kèm lượt chơi.
      // Nếu đã chơi thì trả lượt cũ (status Solved hoặc Failed); FE chuyển sang /play/{id}
      // để hiện màn kết quả (hoặc tiếp tục chơi nếu InProgress).
      router.push(`/play/${attempt.id}`);
    } catch {
      // Error is captured by startDaily.error
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8">
        <header className="text-center">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-widest text-brand-700 hover:underline"
          >
            ← PuzzleArena
          </Link>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-3xl" aria-hidden="true">
              📅
            </span>
            <h1 className="text-3xl font-extrabold sm:text-4xl">Thử thách hàng ngày</h1>
          </div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Mỗi ngày một đề thi duy nhất dành cho tất cả người chơi trên đấu trường
          </p>
        </header>

        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Quy tắc thi đấu Daily
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>
                Mỗi tài khoản chỉ có <strong>1 lượt chơi chính thức</strong> cho mỗi đề daily.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>
                Nếu bạn đã hoàn thành hoặc thất bại trước đó, hệ thống sẽ mở lại màn kết quả xem lại.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>
                Lượt daily không giới hạn thời gian đếm ngược (deadline luôn là null).
              </span>
            </li>
          </ul>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="puzzleIdInput"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Mã đề Daily (Puzzle ID)
              </label>
              <div className="mt-1 flex rounded-xl shadow-sm">
                <input
                  id="puzzleIdInput"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={puzzleId}
                  onChange={(e) => setPuzzleId(e.target.value)}
                  disabled={startDaily.isPending}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-base font-mono text-slate-900 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Ví dụ: 1"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Nhập Puzzle ID của ngày hôm nay (mặc định là 1) để bắt đầu.
              </p>
            </div>

            {startDaily.isError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
              >
                {getDailyErrorMessage(startDaily.error)}
              </div>
            )}

            <button
              type="submit"
              disabled={startDaily.isPending}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-6 font-bold text-white shadow transition-all hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {startDaily.isPending ? "Đang mở đề Daily…" : "Bắt đầu chơi Daily"}
            </button>
          </form>
        </section>

        <div className="text-center">
          <Link
            href="/practice"
            className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Muốn khởi động trước? Vào chế độ Luyện tập →
          </Link>
        </div>
      </div>
    </main>
  );
}
