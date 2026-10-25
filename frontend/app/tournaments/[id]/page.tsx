
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { HubConnection } from "@microsoft/signalr";
import { api, ApiError } from "@/lib/api";
import { startConnection } from "@/lib/hub";

type TournamentStatus =
  | "Open"
  | "Qualifier"
  | "QualifierDone"
  | "Final"
  | "Closed";

interface StandingRow {
  userId?: number | string;
  username: string;
  progress: number;
  mistakes: number;
  durationMs?: number;
  status?: string;
  isFinalist?: boolean;
}

interface TournamentDetail {
  id: number | string;
  name: string;
  gameType: "Sudoku" | "Minesweeper";
  difficulty: "Easy" | "Medium" | "Hard";
  status: TournamentStatus;
  finalistCount: number;
  roundMinutes: number;
  qualifierStartedAt?: string;
  finalStartedAt?: string;
  isRegistered?: boolean;
  standings?: StandingRow[];
}

const STAGES: { key: TournamentStatus; label: string }[] = [
  { key: "Open", label: "Mở đăng ký" },
  { key: "Qualifier", label: "Vòng loại" },
  { key: "QualifierDone", label: "Chờ chung kết" },
  { key: "Final", label: "Chung kết" },
  { key: "Closed", label: "Kết thúc" },
];

const STATUS_LABELS: Record<TournamentStatus, string> = {
  Open: "Đang mở đăng ký",
  Qualifier: "Vòng loại đang diễn ra",
  QualifierDone: "Đã kết thúc vòng loại",
  Final: "Chung kết đang diễn ra",
  Closed: "Đã kết thúc",
};

const STATUS_COLORS: Record<TournamentStatus, string> = {
  Open: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  Qualifier: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  QualifierDone: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  Final: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300",
  Closed: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const DEMO_STANDINGS: StandingRow[] = [
  {
    username: "player1",
    progress: 100,
    mistakes: 0,
    durationMs: 185000,
    status: "Solved",
    isFinalist: true,
  },
  {
    username: "player2",
    progress: 100,
    mistakes: 1,
    durationMs: 210000,
    status: "Solved",
    isFinalist: true,
  },
  {
    username: "player3",
    progress: 85,
    mistakes: 0,
    status: "InProgress",
    isFinalist: true,
  },
  {
    username: "player4",
    progress: 72,
    mistakes: 2,
    status: "InProgress",
    isFinalist: true,
  },
  {
    username: "player5",
    progress: 60,
    mistakes: 1,
    status: "InProgress",
    isFinalist: true,
  },
  {
    username: "player6",
    progress: 45,
    mistakes: 2,
    status: "InProgress",
    isFinalist: true,
  },
];

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remaining,
  ).padStart(2, "0")}`;
}

function formatDuration(durationMs?: number) {
  if (durationMs == null || durationMs < 0) return "--:--";

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}`;
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "Solved":
      return "Đã hoàn thành";
    case "InProgress":
      return "Đang thi";
    case "Eliminated":
      return "Đã bị loại";
    default:
      return status || "Chưa cập nhật";
  }
}

function getRankStyle(index: number) {
  if (index === 0) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }

  if (index === 1) {
    return "border-slate-300/20 bg-slate-300/10 text-slate-200";
  }

  if (index === 2) {
    return "border-orange-400/30 bg-orange-400/10 text-orange-300";
  }

  return "border-white/10 bg-white/[0.04] text-slate-400";
}

function TournamentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");

  const [tournament, setTournament] = useState<TournamentDetail>({
    id,
    name: `Giải đấu PuzzleArena #${id}`,
    gameType: "Sudoku",
    difficulty: "Medium",
    status: "Open",
    finalistCount: 6,
    roundMinutes: 15,
    isRegistered: false,
    standings: DEMO_STANDINGS,
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const showMessage = (
    text: string,
    type: "success" | "error" = "success",
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const reloadDetail = useCallback(async () => {
    if (!id) return;

    try {
      const data = await api.get<TournamentDetail>(
        `/api/tournaments/${id}`,
      );

      if (data) {
        setTournament((prev) => ({
          ...prev,
          ...data,
          standings: data.standings ?? prev.standings ?? [],
        }));
      }
    } catch {
      // Giữ dữ liệu hiện tại nếu backend chưa sẵn sàng.
    }
  }, [id]);

  // Tải thông tin giải đấu và xác định quyền Admin.
  useEffect(() => {
    if (!id) return;

    let active = true;

    const loadData = async () => {
      try {
        const data = await api.get<TournamentDetail>(
          `/api/tournaments/${id}`,
        );

        if (active && data) {
          setTournament((prev) => ({
            ...prev,
            ...data,
            standings: data.standings ?? prev.standings ?? [],
          }));
        }
      } catch {
        // Dùng dữ liệu mặc định nếu API giải đấu chưa khả dụng.
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const loadUser = async () => {
      try {
        const me = await api.get<{ role: string }>("/api/me");

        if (active) {
          setIsAdmin(me?.role === "Admin");
        }
      } catch {
        // Không cấp quyền Admin khi chưa xác minh được tài khoản.
        if (active) setIsAdmin(false);
      }
    };

    void loadData();
    void loadUser();

    return () => {
      active = false;
    };
  }, [id]);

  // Nhận trạng thái và tiến độ thi đấu qua SignalR.
  useEffect(() => {
    if (!id) return;

    let active = true;
    let connection: HubConnection | null = null;

    const stageHandler = (newStatus: TournamentStatus) => {
      if (!active) return;

      setTournament((prev) => ({
        ...prev,
        status: newStatus,
      }));

      void reloadDetail();
    };

    const progressHandler = (update: StandingRow | StandingRow[]) => {
      if (!active) return;

      if (Array.isArray(update)) {
        setTournament((prev) => ({
          ...prev,
          standings: update,
        }));
        return;
      }

      if (!update?.username) return;

      setTournament((prev) => {
        const standings = [...(prev.standings ?? [])];
        const index = standings.findIndex(
          (row) => row.username === update.username,
        );

        if (index >= 0) {
          standings[index] = {
            ...standings[index],
            ...update,
          };
        } else {
          standings.push(update);
        }

        return {
          ...prev,
          standings,
        };
      });
    };

    const connect = async () => {
      try {
        const conn = await startConnection();

        if (!conn || !active) return;

        connection = conn;

        conn.on("stage", stageHandler);
        conn.on("progress", progressHandler);

        await conn.invoke("Watch", Number(id) || id).catch((err) => {
          console.warn("Không thể theo dõi giải đấu:", err);
        });
      } catch (err) {
        console.warn("Không thể khởi tạo kết nối SignalR:", err);
      }
    };

    void connect();

    return () => {
      active = false;

      if (connection) {
        connection.off("stage", stageHandler);
        connection.off("progress", progressHandler);
      }
    };
  }, [id, reloadDetail]);

  // Đặt lại đồng hồ khi bắt đầu một vòng thi mới.
  useEffect(() => {
    if (
      tournament.status === "Qualifier" ||
      tournament.status === "Final"
    ) {
      setRemainingSeconds(
        Math.max(0, tournament.roundMinutes || 15) * 60,
      );
    }
  }, [
    tournament.status,
    tournament.roundMinutes,
  ]);

  // Đếm ngược trong lúc vòng thi đang diễn ra.
  useEffect(() => {
    if (
      tournament.status !== "Qualifier" &&
      tournament.status !== "Final"
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [tournament.status]);

  const handleRegister = async () => {
    if (isRegistering) return;

    setMessage(null);
    setIsRegistering(true);

    try {
      await api.post(`/api/tournaments/${id}/register`);

      setTournament((prev) => ({
        ...prev,
        isRegistered: true,
      }));

      showMessage("Bạn đã đăng ký tham gia giải đấu thành công!");
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setTournament((prev) => ({
          ...prev,
          isRegistered: true,
        }));

        showMessage("Đăng ký thành công trong chế độ Demo.");
      } else {
        showMessage(
          err instanceof Error ? err.message : "Không thể đăng ký giải đấu.",
          "error",
        );
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePlay = async () => {
    if (isPlaying) return;

    setMessage(null);
    setIsPlaying(true);

    try {
      const result = await api.post<{
        attemptId?: number | string;
        id?: number | string;
      }>(`/api/tournaments/${id}/play`);

      const attemptId = result?.attemptId ?? result?.id;

      if (attemptId != null) {
        router.push(`/play/${attemptId}`);
      } else {
        showMessage("Máy chủ chưa trả về mã lượt chơi.", "error");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        router.push(`/play/demo-${id}`);
      } else {
        showMessage(
          err instanceof Error
            ? err.message
            : "Bạn không thể vào thi lúc này.",
          "error",
        );
      }
    } finally {
      setIsPlaying(false);
    }
  };

  const handleAdvance = async (targetStatus?: TournamentStatus) => {
    if (!isAdmin || isAdvancing) return;

    setMessage(null);
    setIsAdvancing(true);

    try {
      await api.post(`/api/tournaments/${id}/advance`);
      await reloadDetail();

      showMessage("Đã gửi yêu cầu chuyển vòng thi.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Chỉ mô phỏng chuyển vòng khi API không khả dụng.
        const order: TournamentStatus[] = [
          "Open",
          "Qualifier",
          "QualifierDone",
          "Final",
          "Closed",
        ];

        const nextStatus =
          targetStatus ??
          order[
            Math.min(
              order.indexOf(tournament.status) + 1,
              order.length - 1,
            )
          ];

        setTournament((prev) => ({
          ...prev,
          status: nextStatus,
        }));

        showMessage("Đã chuyển vòng trong chế độ Demo.");
      } else {
        showMessage(
          err instanceof Error
            ? err.message
            : "Không thể chuyển vòng thi.",
          "error",
        );
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const standings = [...(tournament.standings ?? [])].sort(
    (a, b) =>
      Number(b.progress || 0) - Number(a.progress || 0) ||
      Number(a.mistakes || 0) - Number(b.mistakes || 0) ||
      Number(a.durationMs ?? Number.MAX_SAFE_INTEGER) -
        Number(b.durationMs ?? Number.MAX_SAFE_INTEGER),
  );

  const completedPlayers = standings.filter(
    (player) => player.progress >= 100,
  ).length;

  const currentStageIndex = STAGES.findIndex(
    (stage) => stage.key === tournament.status,
  );

  const isActiveRound =
    tournament.status === "Qualifier" ||
    tournament.status === "Final";

  return (
    <main className="pa-page min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Điều hướng */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-300"
          >
            <span aria-hidden="true">←</span>
            Quay lại danh sách giải đấu
          </Link>

          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            PuzzleArena / Tournament
          </span>
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-violet-950/20 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-xs font-bold text-violet-200">
                  {tournament.gameType === "Sudoku"
                    ? "▦ SUDOKU"
                    : "✹ MINESWEEPER"}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  Độ khó: {tournament.difficulty}
                </span>

                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    STATUS_COLORS[tournament.status]
                  }`}
                >
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                  {STATUS_LABELS[tournament.status]}
                </span>
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                Tournament details
              </p>

              <h1 className="max-w-3xl break-words text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {tournament.name}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Chinh phục thử thách, cạnh tranh thứ hạng và giành suất vào
                vòng chung kết. Theo dõi tiến độ thi đấu ngay tại đây.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {tournament.status === "Open" && (
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={Boolean(tournament.isRegistered) || isRegistering}
                    className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                      tournament.isRegistered
                        ? "cursor-not-allowed border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-950/30 hover:brightness-110 disabled:opacity-60"
                    }`}
                  >
                    {isRegistering
                      ? "Đang đăng ký..."
                      : tournament.isRegistered
                        ? "✓ Đã đăng ký"
                        : "Đăng ký tham gia →"}
                  </button>
                )}

                {isActiveRound && (
                  <button
                    type="button"
                    onClick={handlePlay}
                    disabled={isPlaying}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:brightness-110 disabled:opacity-60"
                  >
                    {isPlaying ? "Đang vào trận..." : "▶ Vào thi ngay"}
                  </button>
                )}

                {tournament.status === "Final" && isAdmin && (
                  <Link
                    href={`/tournaments/${id}/monitor`}
                    className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-5 py-3 text-sm font-bold text-rose-200 transition hover:bg-rose-400/20"
                  >
                    ◉ Màn hình giám sát
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:min-w-64 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-medium text-slate-500">
                  Thời lượng mỗi vòng
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {tournament.roundMinutes}
                  <span className="ml-1 text-sm font-semibold text-slate-400">
                    phút
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-medium text-slate-500">
                  Suất vào chung kết
                </p>
                <p className="mt-2 text-2xl font-black text-cyan-300">
                  Top {tournament.finalistCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Thông báo */}
        {message && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
              messageType === "success"
                ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200"
                : "border-rose-400/20 bg-rose-400/[0.07] text-rose-200"
            }`}
          >
            <span className="text-lg">
              {messageType === "success" ? "✓" : "!"}
            </span>
            <p className="flex-1 leading-6">{message}</p>
            <button
              type="button"
              onClick={() => setMessage(null)}
              aria-label="Đóng thông báo"
              className="text-current opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tiến trình giải đấu */}
        <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
                Tournament journey
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-white">
                Hành trình giải đấu
              </h2>
            </div>

            <span className="text-xs text-slate-500">
              Giai đoạn {currentStageIndex + 1} / {STAGES.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((stage, index) => {
              const isCurrent = tournament.status === stage.key;
              const isComplete = index < currentStageIndex;

              return (
                <div
                  key={stage.key}
                  className={`relative rounded-2xl border p-4 transition ${
                    isCurrent
                      ? "border-violet-400/50 bg-violet-500/10 shadow-lg shadow-violet-950/20"
                      : isComplete
                        ? "border-emerald-400/20 bg-emerald-400/[0.05]"
                        : "border-white/[0.07] bg-white/[0.02]"
                  }`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${
                        isCurrent
                          ? "bg-violet-500 text-white"
                          : isComplete
                            ? "bg-emerald-400/15 text-emerald-300"
                            : "bg-white/[0.06] text-slate-500"
                      }`}
                    >
                      {isComplete ? "✓" : index + 1}
                    </span>

                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                        Hiện tại
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-sm font-bold ${
                      isCurrent
                        ? "text-white"
                        : isComplete
                          ? "text-emerald-200"
                          : "text-slate-500"
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Thống kê nhanh */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Tuyển thủ trên bảng",
              value: standings.length,
              icon: "♟",
              accent: "text-violet-300",
            },
            {
              label: "Đã hoàn thành",
              value: completedPlayers,
              icon: "✓",
              accent: "text-emerald-300",
            },
            {
              label: "Đang thi đấu",
              value: standings.filter(
                (player) =>
                  player.progress > 0 && player.progress < 100,
              ).length,
              icon: "◷",
              accent: "text-cyan-300",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-slate-950/70 p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{stat.label}</p>
                <span className={`text-xl ${stat.accent}`}>
                  {stat.icon}
                </span>
              </div>
              <p className={`mt-3 text-3xl font-black ${stat.accent}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {/* Admin */}
        {isAdmin && (
          <section className="rounded-3xl border border-amber-400/20 bg-slate-950/80 p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-xl">
                  ⚙
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                    Admin control
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold text-white">
                    Bảng điều khiển trọng tài
                  </h2>
                </div>
              </div>

              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-200">
                Quyền quản trị
              </span>
            </div>

            <p className="mb-4 text-sm leading-6 text-slate-400">
              Điều khiển vòng đấu thông qua API. Chỉ sử dụng các thao tác
              này khi bạn có quyền quản trị giải.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleAdvance()}
                disabled={isAdvancing}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
              >
                {isAdvancing ? "Đang xử lý..." : "Chuyển vòng tiếp theo →"}
              </button>

              {STAGES.map((stage) => (
                <button
                  type="button"
                  key={stage.key}
                  onClick={() => void handleAdvance(stage.key)}
                  disabled={isAdvancing}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:opacity-50 ${
                    tournament.status === stage.key
                      ? "border-violet-400/40 bg-violet-500/20 text-violet-200"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {stage.key}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Vòng loại */}
        {(tournament.status === "Qualifier" ||
          tournament.status === "QualifierDone") && (
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-[0.75fr_1.5fr]">
            <div className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-slate-950 p-6">
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />

              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
                  Qualifier round
                </p>

                <h2 className="mt-2 text-xl font-extrabold text-white">
                  {tournament.status === "Qualifier"
                    ? "Thời gian còn lại"
                    : "Vòng loại đã khép lại"}
                </h2>

                <div
                  className={`my-7 text-center font-mono text-5xl font-black tracking-tight sm:text-6xl ${
                    remainingSeconds === 0
                      ? "text-rose-300"
                      : "bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent"
                  }`}
                >
                  {tournament.status === "Qualifier"
                    ? formatClock(remainingSeconds)
                    : "00:00"}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-slate-400">
                    Vé vào chung kết
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    Top {tournament.finalistCount}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Thứ hạng được xác định dựa trên tiến độ, số lỗi và thời
                    gian hoàn thành theo quy tắc của giải.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                    Live leaderboard
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-white">
                    Bảng xếp hạng vòng loại
                  </h2>
                </div>

                {tournament.status === "Qualifier" && (
                  <span className="flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-bold text-rose-200">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                    LIVE
                  </span>
                )}
              </div>

              {standings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                  <p className="text-2xl">♟</p>
                  <p className="mt-3 font-bold text-slate-300">
                    Chưa có dữ liệu xếp hạng
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Bảng xếp hạng sẽ cập nhật khi tuyển thủ bắt đầu thi.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {standings.map((player, index) => {
                    const finalist =
                      player.isFinalist ??
                      index < tournament.finalistCount;

                    return (
                      <div
                        key={`${player.userId ?? player.username}-${index}`}
                        className={`rounded-2xl border p-4 transition ${
                          finalist
                            ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                            : "border-white/[0.07] bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${getRankStyle(
                              index,
                            )}`}
                          >
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-bold text-white">
                                {player.username}
                              </p>

                              {finalist && (
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                  VÉ CHUNG KẾT
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {getStatusLabel(player.status)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-mono text-lg font-black text-cyan-300">
                              {Math.min(
                                100,
                                Math.max(0, player.progress || 0),
                              )}
                              %
                            </p>
                            <p className="text-xs text-slate-500">
                              {player.mistakes} lỗi
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              finalist
                                ? "bg-gradient-to-r from-emerald-400 to-cyan-400"
                                : "bg-gradient-to-r from-violet-500 to-indigo-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, player.progress || 0),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Chung kết */}
        {(tournament.status === "Final" ||
          tournament.status === "Closed") && (
          <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 sm:p-7">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">
                  Grand final
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  {tournament.status === "Final"
                    ? "Cuộc đua vô địch"
                    : "Kết quả chung kết"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Theo dõi tiến độ của các tuyển thủ trong trận đấu quyết định.
                </p>
              </div>

              {tournament.status === "Final" && (
                <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/[0.06] px-5 py-3">
                  <p className="text-xs text-slate-400">Thời gian còn lại</p>
                  <p className="mt-1 font-mono text-2xl font-black text-fuchsia-200">
                    {formatClock(remainingSeconds)}
                  </p>
                </div>
              )}
            </div>

            {standings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
                Chưa có dữ liệu tuyển thủ chung kết.
              </div>
            ) : (
              <div className="space-y-4">
                {standings.slice(0, tournament.finalistCount || 6).map(
                  (player, index) => (
                    <div
                      key={`${player.userId ?? player.username}-${index}`}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${getRankStyle(
                              index,
                            )}`}
                          >
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-white">
                              {player.username}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {player.progress >= 100
                                ? "Đã hoàn thành thử thách"
                                : getStatusLabel(player.status)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-mono text-lg font-black text-cyan-300">
                            {Math.min(
                              100,
                              Math.max(0, player.progress || 0),
                            )}
                            %
                          </p>
                          <p className="text-xs text-slate-500">
                            {player.mistakes} lỗi ·{" "}
                            {formatDuration(player.durationMs)}
                          </p>
                        </div>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            player.progress >= 100
                              ? "bg-gradient-to-r from-emerald-400 to-cyan-300"
                              : "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, player.progress || 0),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        )}

        {/* Trạng thái tải */}
        {isLoading && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
            Đang đồng bộ dữ liệu giải đấu...
          </div>
        )}

        <footer className="pb-4 pt-2 text-center text-xs text-slate-600">
          PuzzleArena · Play smart. Compete fairly.
        </footer>
      </div>
    </main>
  );
}

export default function TournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-400">
          <div className="text-center">
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />
            <p className="text-sm font-semibold">
              Đang tải dữ liệu giải đấu...
            </p>
          </div>
        </main>
      }
    >
      <TournamentDetailContent />
    </Suspense>
  );
}
