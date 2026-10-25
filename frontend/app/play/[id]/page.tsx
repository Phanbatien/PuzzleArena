"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import GameResultView from "@/components/GameResultView";
import MinesweeperBoard from "@/components/MinesweeperBoard";
import SudokuBoard from "@/components/SudokuBoard";
import { formatApiError } from "@/src/lib/api/client";
import { useAbandon, useAttempt, useMove } from "@/src/lib/api/hooks";
import { mapAttemptToBoard, remainingDeadlineMs } from "@/src/lib/game/mapAttempt";

function formatDuration(totalMs: number): string {
  const seconds = Math.ceil(Math.max(0, totalMs) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function PlayAttemptContent() {
  const params = useParams<{ id: string }>();
  const attemptId = Number(params.id);
  const attemptQuery = useAttempt(attemptId);
  const move = useMove(attemptId);
  const abandon = useAbandon(attemptId);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [shieldedNotice, setShieldedNotice] = useState(false);
  const [clientNow, setClientNow] = useState(() => Date.now());
  const attempt = attemptQuery.data;

  useEffect(() => {
    const interval = window.setInterval(() => setClientNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (wrongIndex === null) return;
    const timer = window.setTimeout(() => setWrongIndex(null), 700);
    return () => window.clearTimeout(timer);
  }, [wrongIndex]);

  const board = useMemo(() => attempt && mapAttemptToBoard(attempt, {
    disabled: move.isPending || abandon.isPending,
    lastWrongIndex: wrongIndex,
    onSudokuMove: (index, value) => submitMove(index, value),
    onMinesweeperOpen: (index) => submitMove(index, 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [attempt, abandon.isPending, move.isPending, wrongIndex]);

  function submitMove(index: number, value: number) {
    if (!attempt || attempt.status !== "InProgress" || move.isPending) return;
    void move.mutateAsync({ index, value }).then((response) => {
      if (response.shielded) {
        setShieldedNotice(true);
      }
      if (response.correct) {
        setWrongIndex(null);
      } else if (attempt.game === "Sudoku") {
        setWrongIndex(index);
      }
    }).catch(() => undefined);
  }

  if (!Number.isInteger(attemptId) || attemptId <= 0) return <main className="p-6">ID lượt chơi không hợp lệ.</main>;
  if (attemptQuery.isPending) return <main className="p-6" aria-live="polite">Đang tải lượt chơi…</main>;
  if (attemptQuery.isError || !attempt || !board) return <main className="p-6 text-red-700">Không tải được lượt chơi: {formatApiError(attemptQuery.error)}</main>;

  const finished = attempt.status !== "InProgress";

  if (finished) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
        <GameResultView attempt={attempt} />
      </main>
    );
  }

  const parsedServerNow = Date.parse(attempt.serverNow);
  const serverOffsetMs = Number.isNaN(parsedServerNow) ? 0 : parsedServerNow - attempt.clientReceivedAt;
  const remainingMs = remainingDeadlineMs(attempt, clientNow, serverOffsetMs);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-5">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">PuzzleArena</p>
          <h1 className="mt-1 text-3xl font-bold">{attempt.game === "Sudoku" ? "Sudoku" : "Dò mìn"}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{attempt.difficulty} · Tiến độ {attempt.progress}%</p>
        </header>
        <section className="grid w-full max-w-lg grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-r border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-500">Lỗi</p>
            <p className="mt-1 text-2xl font-bold">{attempt.mistakes}/{attempt.maxMistakes}</p>
          </div>
          {attempt.deadline !== null ? (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Còn lại</p>
              <p className="mt-1 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
                {remainingMs !== null ? formatDuration(remainingMs) : "--:--"}
              </p>
            </div>
          ) : (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Tiến độ</p>
              <p className="mt-1 font-mono text-2xl font-bold">{attempt.progress}%</p>
            </div>
          )}
        </section>
        {shieldedNotice && (
          <div role="status" className="w-full max-w-lg rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm font-semibold text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
            🛡️ Khiên đã đỡ 1 lỗi cho bạn! Nước đi này không bị tính lỗi.
          </div>
        )}
        {board.game === "Sudoku" ? <SudokuBoard {...board.props} /> : <MinesweeperBoard {...board.props} />}
        <button type="button" disabled={abandon.isPending || move.isPending} onClick={() => abandon.mutate()} className="rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white hover:bg-rose-600 disabled:opacity-50">{abandon.isPending ? "Đang bỏ cuộc…" : "Bỏ cuộc"}</button>
        {(move.error || abandon.error) && <p className="text-sm text-red-700" role="alert">{formatApiError(move.error ?? abandon.error)}</p>}
      </div>
    </main>
  );
}

export default function PlayAttemptPage() {
  return (
    <Suspense fallback={<main className="p-6" aria-live="polite">Đang tải lượt chơi…</main>}>
      <PlayAttemptContent />
    </Suspense>
  );
}
