"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PlayerBoardView from "@/components/tournament/PlayerBoardView";
import { api, ApiError } from "@/lib/api";
import type { LiveResponse } from "@/types/tournament";

const POLL_MS = 2000;

// Khán giả xem trận: cả hai người của một trận cạnh nhau, nhiều trận cùng lúc.
// Server trả trạng thái của (bây giờ - delaySeconds), nên không ai nhắc bài được cho người đang thi.
function WatchContent() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    if (!id) return;
    let active = true;
    const load = async () => {
      try {
        const data = await api.get<LiveResponse>(`/api/tournaments/${id}/live`);
        if (!active) return;
        setLive(data);
        setError(null);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : "Không tải được trận đấu.");
      }
    };
    void load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [id]);

  const toggle = (matchId: number) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });

  const shown = live?.matches.filter((m) => !hidden.has(m.matchId)) ?? [];

  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-5 pb-16 pt-8 sm:px-8">
        <Link href={`/tournaments/${id}`} className="text-sm text-slate-400 hover:text-white">← Về trang giải đấu</Link>

        <section className="pa-hero">
          <div className="relative z-10">
            <span className="pa-eyebrow">Xem trực tiếp</span>
            <h1 className="mt-3 text-3xl font-black text-white">Các trận đang diễn ra</h1>
            <p className="mt-2 text-sm text-slate-400">
              Bàn chơi chiếu chậm {live?.delaySeconds ?? 30} giây so với thực tế để giữ công bằng
              {live && <> · đang chiếu tình trạng lúc {new Date(live.asOf).toLocaleTimeString("vi-VN")}</>}.
            </p>
          </div>
        </section>

        {error && <div role="alert" className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">{error}</div>}

        {live && live.matches.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Chọn trận để xem:</span>
            {live.matches.map((m) => (
              <button
                key={m.matchId}
                type="button"
                onClick={() => toggle(m.matchId)}
                aria-pressed={!hidden.has(m.matchId)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${hidden.has(m.matchId) ? "border-slate-700 text-slate-500" : "border-violet-400/40 bg-violet-500/10 text-violet-100"}`}
              >
                {m.players.map((p) => p.username).join(" vs ")}
              </button>
            ))}
          </div>
        )}

        {live && live.qualifier.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-white">Vòng loại: những người dẫn đầu</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {live.qualifier.map((p) => <PlayerBoardView key={p.userId} player={p} />)}
            </div>
          </section>
        )}

        {shown.length > 0 && (
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            {shown.map((m) => (
              <section key={m.matchId} className="pa-panel p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-white">{m.roundName}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${m.status === "Live" ? "bg-rose-500/15 text-rose-200" : "bg-slate-800 text-slate-300"}`}>
                    {m.status === "Live" ? "● Đang đấu" : "Đã xong"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {m.players.map((p) => <PlayerBoardView key={p.userId} player={p} highlight={m.winnerId === p.userId} />)}
                </div>
                {m.winnerId !== null && (
                  <p className="mt-3 text-center text-sm font-bold text-amber-200">
                    🏅 {m.players.find((p) => p.userId === m.winnerId)?.username} thắng
                  </p>
                )}
              </section>
            ))}
          </div>
        )}

        {live && live.matches.length === 0 && live.qualifier.length === 0 && !error && (
          <div className="pa-panel p-8 text-center text-sm text-slate-400">
            {live.status === "Open" ? "Giải chưa bắt đầu." : "Hiện không có trận nào để xem (đang nghỉ giữa vòng, hoặc trận của bạn đang diễn ra)."}
          </div>
        )}
      </div>
    </main>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <WatchContent />
    </Suspense>
  );
}
