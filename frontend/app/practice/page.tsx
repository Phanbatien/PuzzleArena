"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/src/lib/api/client";
import { useStartPractice } from "@/src/lib/api/hooks";
import type { Difficulty, Game } from "@/src/lib/api/types";

function getPracticeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return "Yêu cầu tạo lượt chơi không hợp lệ. Vui lòng kiểm tra lại.";
      case 401:
        return "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.";
      default:
        return error.message || `Đã xảy ra lỗi khi tạo lượt chơi (mã ${error.status}).`;
    }
  }
  return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
}

const GAME_OPTIONS: { value: Game; label: string; description: string; icon: string }[] = [
  {
    value: "Sudoku",
    label: "Sudoku",
    description: "Điền các chữ số 1–9 vào lưới 9×9 sao cho mỗi hàng, cột và khối không lặp lại.",
    icon: "🔢",
  },
  {
    value: "Minesweeper",
    label: "Dò mìn",
    description: "Mở các ô an toàn và gắn cờ những vị trí có mìn ẩn dựa vào số gợi ý.",
    icon: "💣",
  },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; details: Record<Game, string> }[] = [
  {
    value: "Easy",
    label: "Dễ",
    details: {
      Sudoku: "Nhiều ô cho sẵn, phù hợp cho người mới bắt đầu.",
      Minesweeper: "Lưới 9×9, 10 mìn.",
    },
  },
  {
    value: "Medium",
    label: "Trung bình",
    details: {
      Sudoku: "Số ô cho sẵn vừa phải, đòi hỏi suy luận logic tốt.",
      Minesweeper: "Lưới 16×16, 40 mìn.",
    },
  },
  {
    value: "Hard",
    label: "Khó",
    details: {
      Sudoku: "Ít ô cho sẵn, thử thách kỹ năng giải đố nâng cao.",
      Minesweeper: "Lưới 16×30, 99 mìn.",
    },
  },
];

export default function PracticePage() {
  const router = useRouter();
  const startPractice = useStartPractice();

  const [game, setGame] = useState<Game>("Sudoku");
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const attempt = await startPractice.mutateAsync({ game, difficulty });
      router.push(`/play/${attempt.id}`);
    } catch {
      // Error is caught and surfaced through startPractice.error
    }
  };

  const selectedDiffInfo = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.details[game];

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
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Luyện tập</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Chọn trò chơi và độ khó để bắt đầu lượt chơi luyện tập mới
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
          {/* Chọn trò chơi */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              1. Chọn trò chơi
            </h2>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Chọn trò chơi">
              {GAME_OPTIONS.map((item) => {
                const selected = game === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={startPractice.isPending}
                    onClick={() => setGame(item.value)}
                    className={`flex flex-col items-center rounded-2xl border p-4 text-center transition-all ${
                      selected
                        ? "border-brand-600 bg-white shadow-md ring-2 ring-brand-600 dark:border-brand-400 dark:bg-slate-900 dark:ring-brand-400"
                        : "border-slate-200 bg-white/70 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className="text-3xl" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="mt-2 font-bold text-slate-900 dark:text-slate-100">
                      {item.label}
                    </span>
                    <span className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Chọn độ khó */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              2. Chọn độ khó
            </h2>
            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Chọn độ khó">
              {DIFFICULTY_OPTIONS.map((item) => {
                const selected = difficulty === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={startPractice.isPending}
                    onClick={() => setDifficulty(item.value)}
                    className={`rounded-xl border py-3 px-2 text-center font-semibold transition-all ${
                      selected
                        ? "border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-600 dark:border-brand-400 dark:bg-brand-950/50 dark:text-brand-100 dark:ring-brand-400"
                        : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-900"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            {selectedDiffInfo && (
              <p className="rounded-lg bg-slate-200/70 p-3 text-xs text-slate-600 dark:bg-slate-900/80 dark:text-slate-400">
                ℹ️ {selectedDiffInfo}
              </p>
            )}
          </section>

          {/* Thông báo lỗi theo HTTP status */}
          {startPractice.isError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
            >
              {getPracticeErrorMessage(startPractice.error)}
            </div>
          )}

          {/* Nút bắt đầu */}
          <button
            type="submit"
            disabled={startPractice.isPending}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-6 font-bold text-white shadow transition-all hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {startPractice.isPending ? "Đang tạo lượt chơi…" : "Bắt đầu chơi"}
          </button>
        </form>
      </div>
    </main>
  );
}
