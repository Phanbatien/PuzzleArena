import Link from "next/link";
import MinesweeperBoard from "./MinesweeperBoard";
import { mapMinesweeper } from "@/lib/game/mapAttempt";
import type { AttemptResponse } from "@/types/game";

export type GameResultViewProps = {
  attempt: AttemptResponse;
};

function formatDuration(totalMs: number): string {
  const seconds = Math.ceil(Math.max(0, totalMs) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function GameResultView({ attempt }: GameResultViewProps) {
  const isSolved = attempt.status === "Solved";
  const isFailedMinesweeper =
    attempt.board.game === "Minesweeper" && attempt.status === "Failed";
  const minesweeperProps =
    attempt.board.game === "Minesweeper" ? mapMinesweeper(attempt) : null;

  const gameTitle = attempt.game === "Sudoku" ? "Sudoku" : "Dò mìn";
  const difficultyLabel: Record<string, string> = {
    Easy: "Dễ",
    Medium: "Trung bình",
    Hard: "Khó",
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">
          PuzzleArena
        </p>
        <h1 className="mt-1 text-3xl font-bold">{gameTitle}</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Độ khó: {difficultyLabel[attempt.difficulty] ?? attempt.difficulty}
        </p>
      </header>

      <section
        className={`w-full rounded-2xl border p-6 text-center shadow-sm ${
          isSolved
            ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
            : "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
        }`}
      >
        <span className="text-4xl" aria-hidden="true">
          {isSolved ? "🏆" : "💥"}
        </span>
        <h2 className="mt-2 text-2xl font-bold">
          {isSolved ? "Hoàn thành xuất sắc!" : "Lượt chơi đã kết thúc"}
        </h2>
        <p className="mt-1 text-sm opacity-90">
          {isSolved
            ? "Bạn đã giải thành công câu đố."
            : "Bạn đã không hoàn thành câu đố lần này."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-white/80 p-4 text-center sm:grid-cols-4 dark:bg-slate-900/80">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Trạng thái
            </p>
            <p
              className={`mt-1 text-lg font-bold ${
                isSolved
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isSolved ? "Thắng" : "Thua"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Thời gian
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
              {attempt.durationMs !== null
                ? formatDuration(attempt.durationMs)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Lỗi
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              {attempt.mistakes}/{attempt.maxMistakes}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Rating
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
              {attempt.ratingDelta !== null
                ? attempt.ratingDelta > 0
                  ? `+${attempt.ratingDelta}`
                  : `${attempt.ratingDelta}`
                : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Dò mìn thua: board read-only, hiện vị trí mìn */}
      {isFailedMinesweeper && minesweeperProps && (
        <section className="w-full space-y-2">
          <div className="text-center">
            <h3 className="text-sm font-semibold uppercase text-slate-600 dark:text-slate-400">
              Vị trí mìn trên bàn cờ
            </h3>
            <p className="text-xs text-slate-500">
              Các ô có mìn được đánh dấu bằng ký hiệu ✹
            </p>
          </div>
          <div className="flex justify-center overflow-x-auto py-2">
            <MinesweeperBoard {...minesweeperProps} />
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/practice"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-6 font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Chơi lại
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Trở về trang chủ
        </Link>
      </div>
    </div>
  );
}
