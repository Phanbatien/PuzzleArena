"use client";

import Link from "next/link";
import { useAuthToken, useCurrentUser } from "@/src/lib/api/auth";

export default function Home() {
  const token = useAuthToken();
  const user = useCurrentUser();

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white font-black text-sm shadow">
              PA
            </span>
            <span className="text-xl font-extrabold tracking-tight">PuzzleArena</span>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {user?.username ?? "Đã đăng nhập"}
                </span>
                {user?.role === "Admin" && (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    ADMIN
                  </span>
                )}
                <Link
                  href="/login"
                  className="ml-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Tài khoản
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                Đăng nhập / Token
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-12 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
            Đấu trường giải đố thông minh & chống gian lận
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Thử thách trí tuệ với <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              Sudoku & Dò mìn đỉnh cao
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            Hệ thống giải đố trực tuyến hỗ trợ khiên bảo vệ, tính điểm chuẩn xác, chống gian lận và
            đếm ngược đồng bộ chuẩn thời gian thực với server.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Practice Card */}
          <Link
            href="/practice"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl text-brand-600 dark:bg-brand-950">
                🎯
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600">
                Chế độ Luyện tập
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Tự do chọn trò chơi (Sudoku 9×9 hoặc Dò mìn) cùng độ khó Dễ, Trung bình, Khó. Luyện
                tay không giới hạn thời gian.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-sm font-bold text-brand-600 dark:text-brand-400">
              Vào luyện tập ngay <span>→</span>
            </div>
          </Link>

          {/* Daily Card */}
          <Link
            href="/daily"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-amber-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl text-amber-600 dark:bg-amber-950">
                📅
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600">
                Thử thách hàng ngày
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Mỗi ngày 1 bộ đề duy nhất. 1 cơ hội duy nhất cho mỗi tài khoản để tranh tài và lưu
                thành tích cao nhất.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
              Chơi Daily hôm nay <span>→</span>
            </div>
          </Link>

          {/* Admin Anti-Cheat Card */}
          <Link
            href="/admin"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-rose-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-2xl text-rose-600 dark:bg-rose-950">
                🛡️
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600">
                Quản trị chống gian lận
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Dành cho Admin: Lọc và kiểm tra các lượt giải có thời gian bất thường, xem cờ cảnh
                báo và hủy kết quả gian lận.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-sm font-bold text-rose-600 dark:text-rose-400">
              Mở trang Admin <span>→</span>
            </div>
          </Link>
        </div>

        {/* Dev Quicklinks */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
          <span>Khám phá bàn cờ mẫu:</span>
          <Link href="/dev/sudoku" className="hover:text-slate-800 dark:hover:text-slate-300 underline">
            Mẫu Sudoku
          </Link>
          <span>·</span>
          <Link href="/dev/minesweeper" className="hover:text-slate-800 dark:hover:text-slate-300 underline">
            Mẫu Dò mìn
          </Link>
          <span>·</span>
          <Link href="/login" className="hover:text-slate-800 dark:hover:text-slate-300 underline">
            Đăng nhập / Đổi Token
          </Link>
        </div>
      </main>
    </div>
  );
}
