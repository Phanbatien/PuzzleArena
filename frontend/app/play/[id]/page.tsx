"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import MinesweeperBoard from "@/components/MinesweeperBoard";
import SudokuBoard from "@/components/SudokuBoard";
import { ApiError } from "@/src/lib/api/client";
import { useAbandon, useAttempt, useMove } from "@/src/lib/api/hooks";
import { mapAttemptToBoard, remainingDeadlineMs } from "@/src/lib/game/mapAttempt";

function formatDuration(totalMs: number): string {
  const seconds = Math.ceil(Math.max(0, totalMs) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function messageFor(error: unknown): string {
  return error instanceof ApiError ? error.message : "Đã xảy ra lỗi không xác định.";
}

export default function PlayAttemptPage() {
  const params = useParams<{ id: string }>();
  const attemptId = Number(params.id);
  const attemptQuery = useAttempt(attemptId);
  const move = useMove(attemptId);
  const abandon = useAbandon(attemptId);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [clientNow, setClientNow] = useState(() => Date.now());
  const attempt = attemptQuery.data;

  useEffect(() => {
    const interval = window.setInterval(() => setClientNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const board = useMemo(() => attempt && mapAttemptToBoard(attempt, {
    disabled: move.isPending || abandon.isPending,
    wrongIndex,
    onSudokuMove: (index, value) => submitMove(index, value),
    onMinesweeperOpen: (index) => submitMove(index, 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [attempt, abandon.isPending, move.isPending, wrongIndex]);

  function submitMove(index: number, value: number) {
    if (!attempt || attempt.status !== "InProgress" || move.isPending) return;
    void move.mutateAsync({ index, value }).then((response) => {
      if (attempt.game === "Sudoku" && !response.correct) {
        setWrongIndex(index);
        window.setTimeout(() => setWrongIndex(null), 700);
      }
    }).catch(() => undefined);
  }

  if (!Number.isInteger(attemptId) || attemptId <= 0) return <main className="p-6">ID lượt chơi không hợp lệ.</main>;
  if (attemptQuery.isPending) return <main className="p-6" aria-live="polite">Đang tải lượt chơi…</main>;
  if (attemptQuery.isError || !attempt || !board) return <main className="p-6 text-red-700">Không tải được lượt chơi: {messageFor(attemptQuery.error)}</main>;

  const parsedServerNow = Date.parse(attempt.serverNow);
  const serverOffsetMs = Number.isNaN(parsedServerNow) ? 0 : parsedServerNow - attempt.clientReceivedAt;
  const remainingMs = remainingDeadlineMs(attempt, clientNow, serverOffsetMs);
  const finished = attempt.status !== "InProgress";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-5">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">PuzzleArena</p>
          <h1 className="mt-1 text-3xl font-bold">{attempt.game === "Sudoku" ? "Sudoku" : "Dò mìn"}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{attempt.difficulty} · Tiến độ {attempt.progress}%</p>
        </header>
        <section className="grid w-full max-w-lg grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-r border-slate-200 px-4 py-3 dark:border-slate-800"><p className="text-xs font-semibold uppercase text-slate-500">Lỗi</p><p className="mt-1 text-2xl font-bold">{attempt.mistakes}/{attempt.maxMistakes}</p></div>
          <div className="px-4 py-3"><p className="text-xs font-semibold uppercase text-slate-500">{remainingMs === null ? "Thời gian" : "Còn lại"}</p><p className="mt-1 font-mono text-2xl font-bold">{remainingMs === null ? "Không giới hạn" : formatDuration(remainingMs)}</p></div>
        </section>
        {finished && <p className={`rounded-lg px-4 py-3 font-semibold ${attempt.status === "Solved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{attempt.status === "Solved" ? "Bạn đã hoàn thành bàn chơi." : "Lượt chơi đã kết thúc."}</p>}
        {board.game === "Sudoku" ? <SudokuBoard {...board.props} /> : <MinesweeperBoard {...board.props} />}
        {!finished && <button type="button" disabled={abandon.isPending || move.isPending} onClick={() => abandon.mutate()} className="rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white hover:bg-rose-600 disabled:opacity-50">{abandon.isPending ? "Đang bỏ cuộc…" : "Bỏ cuộc"}</button>}
        {(move.isError || abandon.isError) && <p className="text-sm text-red-700" role="alert">{messageFor(move.error ?? abandon.error)}</p>}
      </div>
    </main>
  );
}
