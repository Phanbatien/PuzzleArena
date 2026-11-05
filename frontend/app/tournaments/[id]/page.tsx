"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { HubConnection } from "@microsoft/signalr";
import BracketView from "@/components/tournament/BracketView";
import { api, ApiError } from "@/lib/api";
import { joinGroup, startConnection } from "@/lib/hub";
import type { StandingRow, TournamentDetail } from "@/types/tournament";
import { DIFFICULTY_LABEL, STATUS_TEXT, formatClock, formatTime } from "@/types/tournament";

const STATUS_BADGE: Record<TournamentDetail["status"], string> = {
  Open: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  Qualifier: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  Knockout: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  Closed: "border-slate-600 bg-slate-800/80 text-slate-300",
};

const SCHEDULE_DOT: Record<string, string> = {
  Upcoming: "bg-slate-600",
  Live: "bg-rose-400 animate-pulse",
  Done: "bg-emerald-400",
};

function countdownLabel(t: TournamentDetail) {
  if (t.status === "Open") return "Bắt đầu sau";
  if (t.status === "Qualifier") return "Vòng loại kết thúc sau";
  const live = t.bracket.find((r) => r.round === t.currentRound)?.matches.some((m) => m.status === "Live");
  return live ? "Vòng hiện tại kết thúc sau" : "Vòng tiếp theo bắt đầu sau";
}

function advanceLabel(t: TournamentDetail) {
  if (t.status === "Open") return "Bắt đầu giải ngay";
  if (t.status === "Qualifier") return "Kết thúc vòng loại ngay";
  const live = t.bracket.find((r) => r.round === t.currentRound)?.matches.some((m) => m.status === "Live");
  return live ? "Kết thúc vòng ngay (xử theo luật hết giờ)" : "Bắt đầu vòng tiếp theo ngay";
}

function StandingsTable({ rows, me }: { rows: StandingRow[]; me: number | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Người chơi</th>
            <th className="py-2 pr-3">Tiến độ</th>
            <th className="py-2 pr-3">Lỗi</th>
            <th className="py-2 pr-3">Thời gian</th>
            <th className="py-2">Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className={`border-t border-slate-800 ${r.userId === me ? "bg-amber-300/[0.05]" : ""}`}>
              <td className="py-2.5 pr-3 font-bold text-slate-400">{r.rank}</td>
              <td className="py-2.5 pr-3 font-bold text-white">{r.username}</td>
              <td className="py-2.5 pr-3 text-slate-300">{r.progress}%</td>
              <td className="py-2.5 pr-3 text-slate-300">{r.mistakes}</td>
              <td className="py-2.5 pr-3 font-mono text-slate-300">{r.durationMs !== null ? formatClock(r.durationMs / 1000) : "—"}</td>
              <td className="py-2.5 text-xs">
                {r.qualified ? <span className="font-bold text-emerald-300">Vào nhánh đấu</span>
                  : r.status === "Solved" ? <span className="text-emerald-200">Đã giải</span>
                  : r.status === "NotStarted" ? <span className="text-slate-500">Chưa vào thi</span>
                  : <span className="text-slate-400">{r.status === "InProgress" ? "Đang giải" : "Không hoàn thành"}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TournamentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: number; role: string } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState<"register" | "play" | "advance" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Giờ server - giờ máy, để đồng hồ đếm ngược theo server chứ không theo máy người xem.
  const [clockOffset, setClockOffset] = useState(0);
  // Đang ở phòng chờ trận: khi đối thủ vào và trận có giờ bắt đầu thì tự vào bàn chơi.
  const wasInLobby = useRef(false);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<TournamentDetail>(`/api/tournaments/${id}`);
      setClockOffset(Date.parse(data.serverNow) - Date.now());
      setTournament(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Không tải được giải đấu.");
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!id) return;
      try {
        const data = await api.get<TournamentDetail>(`/api/tournaments/${id}`);
        if (!active) return;
        setClockOffset(Date.parse(data.serverNow) - Date.now());
        setTournament(data);
      } catch (err) {
        if (active) setLoadError(err instanceof ApiError ? err.message : "Không tải được giải đấu.");
      }
    })();
    api.get<{ id: number; role: string }>("/api/me")
      .then((user) => active && setMe(user))
      .catch(() => active && setMe(null));
    return () => {
      active = false;
    };
  }, [id]);

  // Realtime: đổi vòng / có kết quả trận thì tải lại; vòng loại thì cập nhật bảng xếp hạng.
  useEffect(() => {
    if (!id) return;
    let active = true;
    let connection: HubConnection | null = null;
    const onChange = () => {
      if (active) void reload();
    };
    const onProgress = (rows: StandingRow[]) => {
      if (active && Array.isArray(rows)) setTournament((prev) => (prev ? { ...prev, standings: rows } : prev));
    };
    void (async () => {
      const conn = await startConnection();
      if (!conn || !active) return;
      connection = conn;
      conn.on("stage", onChange);
      conn.on("bracket", onChange);
      conn.on("progress", onProgress);
      await joinGroup(conn, "Watch", id).catch(() => {});
    })();
    return () => {
      active = false;
      connection?.off("stage", onChange);
      connection?.off("bracket", onChange);
      connection?.off("progress", onProgress);
    };
  }, [id, reload]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Phòng chờ: tải lại mỗi 2 giây (dự phòng nếu mất SignalR); trận bắt đầu thì tự vào bàn chơi.
  const myMatch = tournament?.myMatch;
  const inLobby = myMatch?.status === "Live" && myMatch.ready && !myMatch.started;
  const matchStarted = myMatch?.status === "Live" && myMatch.started;
  useEffect(() => {
    if (!inLobby) return;
    wasInLobby.current = true;
    const timer = window.setInterval(() => void reload(), 2000);
    return () => window.clearInterval(timer);
  }, [inLobby, reload]);
  useEffect(() => {
    if (!matchStarted || !wasInLobby.current) return;
    wasInLobby.current = false;
    void api.post<{ id?: number }>(`/api/tournaments/${id}/play`).then((r) => r.id && router.push(`/play/${r.id}`));
  }, [matchStarted, id, router]);

  const run = async (kind: "register" | "play" | "advance") => {
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === "register") {
        await api.post(`/api/tournaments/${id}/register`);
        setMessage({ text: "Đăng ký thành công. Nhớ có mặt trước giờ bắt đầu.", type: "success" });
        await reload();
      } else if (kind === "play") {
        const result = await api.post<{ id?: number; waiting?: boolean; message?: string }>(`/api/tournaments/${id}/play`);
        if (result.waiting) {
          wasInLobby.current = true;
          setMessage({ text: result.message ?? "Đang chờ đối thủ vào trận...", type: "success" });
          await reload();
        } else if (result.id) {
          router.push(`/play/${result.id}`);
        }
      } else {
        await api.post(`/api/tournaments/${id}/advance`);
        setMessage({ text: "Đã chuyển sang bước tiếp theo.", type: "success" });
        await reload();
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Có lỗi xảy ra.", type: "error" });
    } finally {
      setBusy(null);
    }
  };

  if (!tournament) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4 text-slate-400">
        {loadError ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-rose-300">{loadError}</p>
            <Link href="/tournaments" className="mt-4 inline-block text-sm text-violet-300 hover:underline">← Danh sách giải đấu</Link>
          </div>
        ) : (
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />
        )}
      </main>
    );
  }

  const t = tournament;
  const isAdmin = me?.role === "Admin";
  const remaining = t.stageEndsAt ? (Date.parse(t.stageEndsAt) - now - clockOffset) / 1000 : null;
  const canRegister = t.status === "Open" && !t.isRegistered && me !== null && (remaining ?? 1) > 0;
  const canPlay = (t.status === "Qualifier" && t.isRegistered) || (t.status === "Knockout" && t.myMatch?.status === "Live");
  const canWatch = t.status !== "Open";
  const currentRound = t.bracket.find((r) => r.round === t.currentRound);

  return (
    <main className="relative isolate min-h-screen text-slate-100">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <Link href="/tournaments" className="text-sm text-slate-400 hover:text-white">← Danh sách giải đấu</Link>

        {/* Thông tin chính */}
        <section className="pa-hero">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1">{t.gameType === "Sudoku" ? "🔢 Sudoku" : "💣 Dò mìn"}</span>
                <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1">Độ khó: {DIFFICULTY_LABEL[t.difficulty]}</span>
                <span className={`rounded-full border px-3 py-1 ${STATUS_BADGE[t.status]}`}>{STATUS_TEXT[t.status]}</span>
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">{t.name}</h1>
              <p className="mt-3 text-sm text-slate-400">
                Bắt đầu {formatTime(t.startsAt)} · {t.participantCount} người đăng ký · tối đa {t.bracketSize} người vào nhánh đấu · mỗi trận {t.roundMinutes} phút
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canRegister && (
                <button type="button" onClick={() => run("register")} disabled={busy !== null} className="pa-button">
                  {busy === "register" ? "Đang đăng ký..." : "Đăng ký tham gia"}
                </button>
              )}
              {t.status === "Open" && t.isRegistered && (
                <span className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200">✓ Đã đăng ký</span>
              )}
              {canPlay && (
                <button type="button" onClick={() => run("play")} disabled={busy !== null || inLobby} className="pa-button">
                  {busy === "play" ? "Đang vào..." : inLobby ? "⏳ Đang chờ đối thủ..." : t.status === "Knockout" && !t.myMatch?.started ? "🎮 Vào phòng thi đấu" : "🎮 Vào thi ngay"}
                </button>
              )}
              {canWatch && (
                <Link href={`/tournaments/${t.id}/watch`} className="pa-button-secondary">👁️ Xem trực tiếp (trễ {t.spectatorDelaySeconds}s)</Link>
              )}
              {isAdmin && <Link href={`/tournaments/${t.id}/monitor`} className="pa-button-secondary">📺 Màn hình ban tổ chức</Link>}
            </div>
          </div>
        </section>

        {message && (
          <div role="status" className={`rounded-xl border p-4 text-sm ${message.type === "error" ? "border-rose-400/25 bg-rose-500/10 text-rose-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
            {message.text}
          </div>
        )}

        {t.champion && (
          <section className="rounded-3xl border border-amber-300/30 bg-amber-300/[0.06] p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-200">Nhà vô địch</p>
            <p className="mt-2 text-3xl font-black text-white">🏆 {t.champion.username}</p>
          </section>
        )}
        {t.closedNote && <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">{t.closedNote}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Hình thức + lịch */}
          <section className="pa-panel p-5 sm:p-6">
            <span className="pa-eyebrow">Hình thức thi đấu</span>
            <p className="mt-3 text-sm leading-7 text-slate-300">{t.formatSummary}</p>
            {t.description && (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Luật của ban tổ chức</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">{t.description}</p>
              </div>
            )}
            <ul className="mt-4 space-y-1 text-xs leading-6 text-slate-400">
              <li>• Hạt giống: theo điểm hạng (hoặc thứ hạng vòng loại). Hạt giống 1 và 2 chỉ gặp nhau ở chung kết.</li>
              <li>• Không đăng ký vẫn xem được mọi trận, nhưng bàn chơi chiếu chậm {t.spectatorDelaySeconds} giây để không ai nhắc bài được.</li>
              <li>• Người đang thi không xem được trận của chính mình.</li>
            </ul>
          </section>

          <section className="pa-panel p-5 sm:p-6">
            <span className="pa-eyebrow">Lịch thi đấu</span>
            {remaining !== null && remaining > 0 && (
              <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-4 text-center">
                <p className="text-xs font-bold text-slate-400">{countdownLabel(t)}</p>
                <p className="mt-1 font-mono text-4xl font-black text-white">{formatClock(remaining)}</p>
              </div>
            )}
            <ol className="mt-4 space-y-2">
              {t.schedule.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <span className="flex items-center gap-2.5 text-sm font-bold text-white">
                    <span className={`h-2 w-2 rounded-full ${SCHEDULE_DOT[item.status]}`} />
                    {item.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.status === "Upcoming" && t.status === "Open" ? "dự kiến " : ""}
                    {formatTime(item.startsAt)}
                  </span>
                </li>
              ))}
            </ol>
            {t.status === "Open" && <p className="mt-3 text-xs text-slate-500">Giờ các vòng sau là dự kiến: vòng chỉ bắt đầu khi vòng trước xong, nghỉ ngắn giữa các vòng.</p>}
          </section>
        </div>

        {/* Trận của tôi */}
        {t.myMatch && t.status !== "Open" && (
          <section className="pa-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <span className="pa-eyebrow">Trận của bạn</span>
              <p className="mt-2 text-lg font-extrabold text-white">
                {t.myMatch.roundName}: gặp {t.myMatch.opponent ? t.myMatch.opponent.username : "(miễn đấu)"}
              </p>
              <p className="text-sm text-slate-400">
                {t.myMatch.status === "Pending" && `Bắt đầu lúc ${formatTime(currentRound?.startsAt)}. Hãy có mặt đúng giờ.`}
                {t.myMatch.status === "Live" && !t.myMatch.started && (t.myMatch.ready
                  ? `Bạn đã vào phòng. Đang chờ ${t.myMatch.opponent?.username ?? "đối thủ"} vào, đủ hai người thì đếm ngược và bắt đầu cùng lúc.`
                  : t.myMatch.opponentReady
                    ? `${t.myMatch.opponent?.username ?? "Đối thủ"} đã vào phòng và đang chờ bạn!`
                    : "Hãy vào phòng thi đấu. Không vào trước hạn sẽ bị xử thua.")}
                {t.myMatch.status === "Live" && t.myMatch.started && "Trận đang diễn ra: vào thi ngay, ai giải xong trước thắng."}
                {t.myMatch.status === "Done" && (t.myMatch.won ? (t.status === "Closed" ? "Bạn đã thắng trận cuối cùng!" : "Bạn thắng, chờ vòng tiếp theo.") : `Bạn đã dừng bước ở ${t.myMatch.roundName}.`)}
              </p>
            </div>
            {canPlay && t.status === "Knockout" && (
              <button type="button" onClick={() => run("play")} disabled={busy !== null || inLobby} className="pa-button">
                {inLobby ? "⏳ Đang chờ..." : t.myMatch.started ? "🎮 Vào thi" : "🎮 Vào phòng"}
              </button>
            )}
          </section>
        )}

        {/* Admin */}
        {isAdmin && t.status !== "Closed" && (
          <section className="rounded-3xl border border-amber-400/20 bg-slate-950/80 p-5 sm:p-6">
            <span className="pa-eyebrow">Ban tổ chức</span>
            <p className="mt-2 text-sm text-slate-400">Giải tự chạy theo giờ. Bấm nút dưới đây để làm bước tiếp theo ngay, không chờ.</p>
            <button type="button" onClick={() => run("advance")} disabled={busy !== null} className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm font-extrabold text-amber-100 transition hover:bg-amber-400/20 disabled:opacity-50">
              {busy === "advance" ? "Đang xử lý..." : advanceLabel(t)}
            </button>
          </section>
        )}

        {/* Vòng loại */}
        {t.standings.length > 0 && (t.status === "Qualifier" || t.schedule.some((s) => s.name === "Vòng loại")) && (
          <section className="pa-panel p-5 sm:p-6">
            <span className="pa-eyebrow">{t.status === "Qualifier" ? "Live · vòng loại" : "Kết quả vòng loại"}</span>
            <h2 className="mt-2 text-xl font-black text-white">Bảng xếp hạng vòng loại</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">Mọi người giải chung một đề, top {t.bracketSize} vào nhánh đấu.</p>
            <StandingsTable rows={t.standings} me={me?.id ?? null} />
          </section>
        )}

        {/* Nhánh đấu */}
        {t.bracket.length > 0 ? (
          <section className="pa-panel p-5 sm:p-6">
            <span className="pa-eyebrow">Nhánh loại trực tiếp</span>
            <h2 className="mb-4 mt-2 text-xl font-black text-white">Nhánh đấu</h2>
            <BracketView rounds={t.bracket} me={me?.id ?? null} />
          </section>
        ) : (
          t.status === "Open" && (
            <section className="pa-panel p-5 text-sm text-slate-400 sm:p-6">
              Nhánh đấu được lập lúc giải bắt đầu ({formatTime(t.startsAt)}), dựa trên số người đăng ký khi đó.
            </section>
          )
        )}
      </div>
    </main>
  );
}

export default function TournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4 text-slate-400">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />
        </main>
      }
    >
      <TournamentDetailContent />
    </Suspense>
  );
}
