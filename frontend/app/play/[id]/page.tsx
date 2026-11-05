"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import GameResultView from "@/components/GameResultView";
import MinesweeperBoard from "@/components/MinesweeperBoard";
import SudokuBoard from "@/components/SudokuBoard";
import { formatApiError } from "@/lib/api";
import { getBoosters } from "@/lib/daily";
import {
  mapAttemptToBoard,
  remainingDeadlineMs,
} from "@/lib/game/mapAttempt";
import { useAbandon, useAttempt, useHint, useMove } from "@/lib/hooks";
import type { InventoryItem } from "@/types/game";

function formatDuration(totalMs: number): string {
  const seconds = Math.ceil(Math.max(0, totalMs) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function PlayAttemptContent() {
  const { user, isReady } = useAuth();
  const params = useParams<{ id: string }>();
  const attemptId = Number(params.id);
  const attemptQuery = useAttempt(attemptId);
  const move = useMove(attemptId);
  const abandon = useAbandon(attemptId);
  const hint = useHint(attemptId);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [shieldedNotice, setShieldedNotice] = useState(false);
  const [leaveNotice, setLeaveNotice] = useState(false);
  const [boosters, setBoosters] = useState<InventoryItem[] | null>(null);
  const [clientNow, setClientNow] = useState(() => Date.now());
  const hadCountdown = useRef(false);
  const attempt = attemptQuery.data;
  const inProgress = attempt?.status === "InProgress";
  const inTournament = attempt?.tournamentId != null;

  // Dừng đồng hồ ngay lập tức khi đăng xuất hoặc khi ván không còn InProgress
  useEffect(() => {
    if (!isReady || !user || !attempt || attempt.status !== "InProgress") return;
    const interval = window.setInterval(() => setClientNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [isReady, user, attempt?.status, attempt]);

  useEffect(() => {
    if (wrongIndex === null) return;
    const timer = window.setTimeout(() => setWrongIndex(null), 700);
    return () => window.clearTimeout(timer);
  }, [wrongIndex]);

  // Số Gợi ý / Khiên còn trong kho (chỉ có ý nghĩa ngoài giải đấu).
  const reloadBoosters = () => {
    getBoosters().then(setBoosters).catch(() => setBoosters([]));
  };
  useEffect(() => {
    if (!user || inTournament) return;
    getBoosters().then(setBoosters).catch(() => setBoosters([]));
  }, [user, inTournament]);

  // Đang thi đấu giải: không được rời trận (đóng tab thì trình duyệt hỏi lại, nút Back bị giữ lại).
  useEffect(() => {
    if (!inTournament || !inProgress) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
      setLeaveNotice(true);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [inTournament, inProgress]);

  // Đếm ngược chung của trận (giờ server): hết đếm ngược thì tải lại để nhận đề.
  const serverOffsetMs = attempt && !Number.isNaN(Date.parse(attempt.serverNow))
    ? Date.parse(attempt.serverNow) - attempt.clientReceivedAt
    : 0;
  const startsInMs = attempt ? Date.parse(attempt.startedAt) - (clientNow + serverOffsetMs) : 0;
  const countingDown = inProgress && startsInMs > 0;
  useEffect(() => {
    if (countingDown) {
      hadCountdown.current = true;
    } else if (hadCountdown.current) {
      hadCountdown.current = false;
      void attemptQuery.refetch();
    }
  }, [countingDown, attemptQuery]);

  const board = useMemo(
    () =>
      attempt &&
      mapAttemptToBoard(attempt, {
        disabled: move.isPending || abandon.isPending || hint.isPending || countingDown,
        lastWrongIndex: wrongIndex,
        onSudokuMove: (index, value) => submitMove(index, value),
        onMinesweeperOpen: (index) => submitMove(index, 0),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attempt, abandon.isPending, move.isPending, hint.isPending, countingDown, wrongIndex],
  );

  function submitMove(index: number, value: number) {
    if (!attempt || attempt.status !== "InProgress" || move.isPending) return;
    void move
      .mutateAsync({ index, value })
      .then((response) => {
        if (response.shielded) {
          setShieldedNotice(true);
          reloadBoosters();
        }
        if (response.correct) {
          setWrongIndex(null);
        } else if (attempt.game === "Sudoku") {
          setWrongIndex(index);
        }
      })
      .catch(() => undefined);
  }

  if (!isReady) {
    return (
      <main className="p-6" aria-live="polite">
        Đang tải lượt chơi…
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-4xl" aria-hidden="true">
            🔒
          </span>
          <h2 className="mt-4 text-xl font-bold">Phiên chơi đã tạm dừng</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Bạn đã đăng xuất hoặc chưa đăng nhập. Bàn chơi và đồng hồ đếm ngược
            đã được ẩn ngay lập tức để bảo vệ lượt chơi của bạn.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
          >
            Đăng nhập lại để tiếp tục chơi
          </Link>
        </div>
      </main>
    );
  }

  if (!Number.isInteger(attemptId) || attemptId <= 0)
    return <main className="p-6">ID lượt chơi không hợp lệ.</main>;
  if (attemptQuery.isPending)
    return (
      <main className="p-6" aria-live="polite">
        Đang tải lượt chơi…
      </main>
    );
  if (attemptQuery.isError || !attempt || !board)
    return (
      <main className="p-6 text-red-700">
        Không tải được lượt chơi: {formatApiError(attemptQuery.error)}
      </main>
    );

  if (!inProgress) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
        <GameResultView attempt={attempt} />
      </main>
    );
  }

  const remainingMs = remainingDeadlineMs(attempt, clientNow, serverOffsetMs);
  const hintLeft = boosters?.find((b) => b.type === "Hint")?.amount ?? 0;
  const shieldLeft = boosters?.find((b) => b.type === "Shield")?.amount ?? 0;
  const actionError = move.error ?? abandon.error ?? hint.error;

  return (
    // Thi đấu giải: phủ toàn màn hình (che cả thanh menu, nút đăng xuất) để không rời trận được.
    <main className={`min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8 ${inTournament ? "fixed inset-0 z-[60] overflow-y-auto" : ""}`}>
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-5">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">
            {inTournament ? "PuzzleArena · Đang thi đấu giải" : "PuzzleArena"}
          </p>
          <h1 className="mt-1 text-3xl font-bold">
            {attempt.game === "Sudoku" ? "Sudoku" : "Dò mìn"}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {attempt.difficulty} · Tiến độ {attempt.progress}%
          </p>
        </header>

        {inTournament && (
          <div role="status" className="w-full max-w-lg rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-center text-sm font-semibold text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
            🔒 Đang thi đấu: không thể thoát hay bỏ cuộc giữa trận. Trận kết thúc khi bạn giải xong, thua theo luật hoặc hết giờ.
            {leaveNotice && <span className="mt-1 block font-normal">Nút quay lại đã bị khóa trong lúc thi.</span>}
          </div>
        )}

        {countingDown && (
          <div role="status" aria-live="assertive" className="w-full max-w-lg rounded-2xl border border-violet-300 bg-violet-50 px-4 py-6 text-center dark:border-violet-800 dark:bg-violet-950/60">
            <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">Cả hai đã vào. Trận bắt đầu sau</p>
            <p className="mt-1 font-mono text-6xl font-black text-violet-700 dark:text-violet-200">{Math.ceil(startsInMs / 1000)}</p>
            <p className="mt-1 text-xs text-violet-800/70 dark:text-violet-300/70">Hai người nhận đề cùng một lúc.</p>
          </div>
        )}

        {/* Dashboard stats */}
        <section className="grid w-full max-w-lg grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-r border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Lỗi
            </p>
            <p className="mt-1 text-2xl font-bold">
              {attempt.mistakes}/{attempt.maxMistakes}
            </p>
          </div>
          {attempt.deadline !== null ? (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Còn lại
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
                {remainingMs !== null ? formatDuration(countingDown ? remainingMs - startsInMs : remainingMs) : "--:--"}
              </p>
            </div>
          ) : (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Tiến độ
              </p>
              <p className="mt-1 font-mono text-2xl font-bold">
                {attempt.progress}%
              </p>
            </div>
          )}
        </section>

        {/* Gợi ý & Khiên: chỉ ngoài giải đấu (trong giải ai cũng như nhau) */}
        {inTournament ? (
          <p className="text-xs text-slate-500">Giải đấu không dùng Gợi ý và Khiên.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={hintLeft < 1 || hint.isPending || move.isPending || hint.isSuccess}
              onClick={() => hint.mutate(undefined, { onSettled: reloadBoosters })}
              title={hintLeft < 1 ? "Giải 1 đề daily trong ngày để nhận 1 Gợi ý" : "Điền giúp một ô đúng (1 lần mỗi ván)"}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-1.5 text-xs font-semibold text-sky-900 shadow-sm transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-200"
            >
              <span>💡</span> {hint.isPending ? "Đang gợi ý…" : hint.isSuccess ? "Đã dùng Gợi ý" : `Gợi ý (còn ${hintLeft})`}
            </button>
            <div
              title="Khiên tự đỡ lỗi sai đầu tiên của ván (không tính lỗi). Giải 5 đề daily trong tuần để nhận."
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
            >
              <span>🛡️</span>
              {shieldLeft > 0 ? `Khiên đang bật: còn ${shieldLeft}, tự đỡ lỗi sai đầu tiên` : "Chưa có Khiên (giải 5 đề daily/tuần để nhận)"}
            </div>
          </div>
        )}

        {shieldedNotice && (
          <div
            role="status"
            className="w-full max-w-lg rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm font-semibold text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
          >
            🛡️ Khiên đã đỡ 1 lỗi cho bạn! Nước đi này không bị tính lỗi.
          </div>
        )}

        {board.game === "Sudoku" ? (
          <SudokuBoard {...board.props} />
        ) : (
          <MinesweeperBoard {...board.props} />
        )}

        {!inTournament && (
          <button
            type="button"
            disabled={abandon.isPending || move.isPending}
            onClick={() => abandon.mutate()}
            className="rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {abandon.isPending ? "Đang bỏ cuộc…" : "Bỏ cuộc"}
          </button>
        )}
        {actionError && (
          <p className="text-sm text-red-700" role="alert">
            {formatApiError(actionError)}
          </p>
        )}
      </div>
    </main>
  );
}

export default function PlayAttemptPage() {
  return (
    <Suspense
      fallback={
        <main className="p-6" aria-live="polite">
          Đang tải lượt chơi…
        </main>
      }
    >
      <PlayAttemptContent />
    </Suspense>
  );
}
