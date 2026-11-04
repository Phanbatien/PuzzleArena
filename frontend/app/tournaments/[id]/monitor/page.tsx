"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { HubConnection } from "@microsoft/signalr";
import PlayerBoardView from "@/components/tournament/PlayerBoardView";
import { api, ApiError } from "@/lib/api";
import { joinGroup, startConnection } from "@/lib/hub";
import type { MonitorRow, PlayerBoard } from "@/types/tournament";

function toBoard(row: MonitorRow): PlayerBoard {
  return { userId: row.userId, username: row.username, seed: null, progress: row.progress, mistakes: row.mistakes, status: row.status, board: row.board };
}

// Màn hình ban tổ chức (chỉ admin): bàn chơi THỜI GIAN THỰC của mọi trận đang diễn ra, nhóm theo trận.
function MonitorContent() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [rows, setRows] = useState<MonitorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setRows(await api.get<MonitorRow[]>(`/api/tournaments/${id}/monitor`));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được dữ liệu giám sát.");
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    let connection: HubConnection | null = null;
    const onBoard = (row: MonitorRow) => {
      if (!active || !row) return;
      setRows((prev) => {
        const i = prev.findIndex((r) => r.userId === row.userId && r.matchId === row.matchId);
        if (i < 0) return [...prev, row];
        const next = [...prev];
        next[i] = { ...prev[i], ...row, finishRank: row.finishRank ?? prev[i].finishRank };
        return next;
      });
    };
    const onRound = () => {
      if (active) void load(); // vòng mới: danh sách trận đổi
    };
    void (async () => {
      try {
        const data = await api.get<MonitorRow[]>(`/api/tournaments/${id}/monitor`);
        if (active) setRows(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : "Không tải được dữ liệu giám sát.");
      }
      const conn = await startConnection();
      if (!conn || !active) return;
      connection = conn;
      conn.on("board", onBoard);
      conn.on("bracket", onRound);
      await joinGroup(conn, "Watch", id).catch(() => {});
      await joinGroup(conn, "Monitor", id)
        .then(() => active && setConnected(true))
        .catch(() => active && setError("Chỉ admin mới xem được màn hình này."));
    })();
    return () => {
      active = false;
      connection?.off("board", onBoard);
      connection?.off("bracket", onRound);
    };
  }, [id, load]);

  const matchIds = [...new Set(rows.map((r) => r.matchId))];

  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-5 pb-16 pt-8 sm:px-8">
        <Link href={`/tournaments/${id}`} className="text-sm text-slate-400 hover:text-white">← Về trang giải đấu</Link>
        <section className="pa-hero">
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="pa-eyebrow">Ban tổ chức · thời gian thực</span>
              <h1 className="mt-3 text-3xl font-black text-white">Màn hình giám sát</h1>
              <p className="mt-2 text-sm text-slate-400">Không chiếu màn hình này cho khán giả: bàn chơi ở đây không bị trễ.</p>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${connected ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-slate-700 text-slate-400"}`}>
              {connected ? "● Đang nhận dữ liệu trực tiếp" : "Đang kết nối..."}
            </span>
          </div>
        </section>

        {error && <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

        {rows.length === 0 && !error && <div className="pa-panel p-8 text-center text-sm text-slate-400">Chưa có trận nào đang diễn ra.</div>}

        <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
          {matchIds.map((matchId) => {
            const players = rows.filter((r) => r.matchId === matchId);
            return (
              <section key={matchId ?? "qualifier"} className="pa-panel p-4 sm:p-5">
                <p className="mb-3 text-sm font-extrabold text-white">
                  {matchId === null ? "Vòng loại" : players.map((p) => p.username).join(" vs ")}
                </p>
                <div className={`grid grid-cols-1 gap-3 ${matchId === null ? "sm:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2"}`}>
                  {players.map((p) => <PlayerBoardView key={p.userId} player={toBoard(p)} highlight={p.finishRank === 1} />)}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function MonitorPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <MonitorContent />
    </Suspense>
  );
}
