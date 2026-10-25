
"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { HubConnection } from "@microsoft/signalr";
import { api, ApiError } from "@/lib/api";
import { startConnection } from "@/lib/hub";

type TournamentStatus = "Open" | "Qualifier" | "QualifierDone" | "Final" | "Closed";

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
  { key: "Open", label: "1. Mở đăng ký" },
  { key: "Qualifier", label: "2. Vòng loại" },
  { key: "QualifierDone", label: "3. Chờ Chung kết" },
  { key: "Final", label: "4. Chung kết (Top 6)" },
  { key: "Closed", label: "5. Kết thúc" },
];

function TournamentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [tournament, setTournament] = useState<TournamentDetail>({
    id,
    name: `Giải Đấu Siêu Trí Tuệ #${id}`,
    gameType: "Sudoku",
    difficulty: "Medium",
    status: "Open",
    finalistCount: 6,
    roundMinutes: 15,
    isRegistered: false,
    standings: [
      { username: "player1", progress: 100, mistakes: 0, durationMs: 185000, status: "Solved", isFinalist: true },
      { username: "player2", progress: 100, mistakes: 1, durationMs: 210000, status: "Solved", isFinalist: true },
      { username: "player3", progress: 85, mistakes: 0, status: "InProgress", isFinalist: true },
      { username: "player4", progress: 72, mistakes: 2, status: "InProgress", isFinalist: true },
      { username: "player5", progress: 60, mistakes: 1, status: "InProgress", isFinalist: true },
      { username: "player6", progress: 45, mistakes: 2, status: "InProgress", isFinalist: true },
    ],
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15 * 60);
  const [message, setMessage] = useState<string | null>(null);

  const reloadDetail = useCallback(async () => {
    try {
      const data = await api.get<TournamentDetail>(`/api/tournaments/${id}`);
      if (data) setTournament(data);
    } catch {
      // Giữ state hiện tại nếu backend chưa bật.
    }
  }, [id]);

  // Tải thông tin giải đấu và quyền người dùng.
  useEffect(() => {
    let active = true;

    api
      .get<TournamentDetail>(`/api/tournaments/${id}`)
      .then((data) => {
        if (active && data) setTournament(data);
      })
      .catch(() => {});

    api
      .get<{ role: string }>("/api/me")
      .then((me) => {
        if (active) setIsAdmin(me?.role === "Admin");
      })
      .catch(() => {
        if (active) setIsAdmin(true);
      });

    return () => {
      active = false;
    };
  }, [id]);

  // SignalR: theo dõi giải đấu và nhận tiến độ realtime.
  useEffect(() => {
    let active = true;
    let connection: HubConnection | null = null;

    let stageHandler:
      | ((newStatus: TournamentStatus) => void)
      | undefined;

    let progressHandler:
      | ((update: StandingRow | StandingRow[]) => void)
      | undefined;

    startConnection()
      .then((conn) => {
        if (!conn || !active) return;

        connection = conn;

        conn.invoke("Watch", Number(id) || id).catch((err) => {
          console.warn("Không thể theo dõi giải đấu qua SignalR:", err);
        });

        stageHandler = (newStatus) => {
          if (!active) return;

          setTournament((prev) => ({
            ...prev,
            status: newStatus,
          }));

          void reloadDetail();
        };

        progressHandler = (update) => {
          if (!active) return;

          if (Array.isArray(update)) {
            setTournament((prev) => ({
              ...prev,
              standings: update,
            }));
          } else if (update && update.username) {
            setTournament((prev) => {
              const list = [...(prev.standings ?? [])];
              const idx = list.findIndex(
                (row) => row.username === update.username,
              );

              if (idx >= 0) {
                list[idx] = { ...list[idx], ...update };
              } else {
                list.push(update);
              }

              return { ...prev, standings: list };
            });
          }
        };

        conn.on("stage", stageHandler);
        conn.on("progress", progressHandler);
      })
      .catch((err) => {
        console.warn("Không thể khởi tạo kết nối SignalR:", err);
      });

    return () => {
      active = false;

      if (connection && stageHandler) {
        connection.off("stage", stageHandler);
      }

      if (connection && progressHandler) {
        connection.off("progress", progressHandler);
      }
    };
  }, [id, reloadDetail]);

  // Đồng hồ đếm ngược vòng thi.
  useEffect(() => {
    if (
      tournament.status !== "Qualifier" &&
      tournament.status !== "Final"
    ) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [tournament.status]);

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;

    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleRegister = async () => {
    setMessage(null);

    try {
      await api.post(`/api/tournaments/${id}/register`);

      setTournament((prev) => ({ ...prev, isRegistered: true }));
      setMessage("✅ Đăng ký tham gia giải đấu thành công!");
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setTournament((prev) => ({ ...prev, isRegistered: true }));
        setMessage("✅ Đã đăng ký tham gia (Chế độ Demo)!");
      } else {
        setMessage(
          err instanceof Error ? err.message : "Lỗi khi đăng ký.",
        );
      }
    }
  };

  const handlePlay = async () => {
    setMessage(null);

    try {
      const res = await api.post<{
        attemptId?: number | string;
        id?: number | string;
      }>(`/api/tournaments/${id}/play`);

      const attemptId = res?.attemptId ?? res?.id;

      if (attemptId) {
        router.push(`/play/${attemptId}`);
      } else {
        setMessage("Không tìm thấy mã lượt chơi từ máy chủ.");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        router.push(`/play/demo-${id}`);
      } else {
        setMessage(
          err instanceof Error
            ? err.message
            : "Bạn không thể vào thi lúc này.",
        );
      }
    }
  };

  const handleAdvance = async (targetStatus?: TournamentStatus) => {
    try {
      await api.post(`/api/tournaments/${id}/advance`);
      await reloadDetail();
    } catch {
      const order: TournamentStatus[] = [
        "Open",
        "Qualifier",
        "QualifierDone",
        "Final",
        "Closed",
      ];

      const next =
        targetStatus ??
        order[
          Math.min(
            order.indexOf(tournament.status) + 1,
            order.length - 1,
          )
        ];

      setTournament((prev) => ({ ...prev, status: next }));
      setRemainingSeconds(tournament.roundMinutes * 60);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Bảng điều khiển Admin */}
        {isAdmin && (
          <div className="bg-slate-900 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center shadow-lg border border-slate-700 text-white gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛠️</span>
              <span className="font-bold text-slate-200">
                Bảng Điều Khiển Trọng Tài (Admin)
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAdvance()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold transition"
              >
                ⏭️ Chuyển vòng tiếp theo (/advance)
              </button>

              {STAGES.map((st) => (
                <button
                  key={st.key}
                  onClick={() => handleAdvance(st.key)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    tournament.status === st.key
                      ? "bg-sky-500 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {st.key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thanh tiến trình 5 bước của giải đấu */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STAGES.map((st) => {
            const active = tournament.status === st.key;

            return (
              <div
                key={st.key}
                className={`p-3 rounded-xl text-center text-xs font-bold border transition-all ${
                  active
                    ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                }`}
              >
                {st.label}
              </div>
            );
          })}
        </div>

        {message && (
          <div className="p-4 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-sm font-semibold">
            {message}
          </div>
        )}

        {/* Thông tin giải và nút hành động */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div className="flex gap-2 mb-2">
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-full">
                {tournament.gameType === "Sudoku"
                  ? "🔢 Sudoku"
                  : "💣 Minesweeper"}{" "}
                · {tournament.difficulty}
              </span>

              <span className="px-3 py-1 bg-sky-100 text-sky-800 text-xs font-bold rounded-full">
                Trạng thái: {tournament.status}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              {tournament.name}
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            {tournament.status === "Open" && (
              <button
                onClick={handleRegister}
                disabled={tournament.isRegistered}
                className={`px-8 py-3 font-bold rounded-xl transition ${
                  tournament.isRegistered
                    ? "bg-emerald-100 text-emerald-700 cursor-default"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {tournament.isRegistered
                  ? "✅ Đã Đăng Ký"
                  : "📝 Đăng Ký Tham Gia"}
              </button>
            )}

            {(tournament.status === "Qualifier" ||
              tournament.status === "Final") && (
              <button
                onClick={handlePlay}
                className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-md"
              >
                🎮 Vào Thi Ngay
              </button>
            )}

            {tournament.status === "Final" && isAdmin && (
              <Link
                href={`/tournaments/${id}/monitor`}
                className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md"
              >
                📺 Màn Hình Giám Sát Chung Kết
              </Link>
            )}
          </div>
        </div>

        {/* Đồng hồ đếm ngược và bảng xếp hạng vòng loại */}
        {(tournament.status === "Qualifier" ||
          tournament.status === "QualifierDone") && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
              <p className="text-slate-500 font-semibold mb-2">
                {tournament.status === "Qualifier"
                  ? "Đồng hồ đếm ngược Vòng loại"
                  : "Vòng loại đã khép lại"}
              </p>

              <p className="text-5xl font-mono font-black text-indigo-600">
                {tournament.status === "Qualifier"
                  ? formatClock(remainingSeconds)
                  : "00:00"}
              </p>

              <p className="text-xs text-slate-400 mt-3">
                Top {tournament.finalistCount} người nhanh và ít lỗi nhất vào Chung kết!
              </p>
            </div>

            <div className="md:col-span-2 bg-slate-900 rounded-2xl p-6 shadow-lg">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 inline-block animate-pulse" />
                Bảng Xếp Hạng Vòng Loại (Cập nhật Live)
              </h2>

              <div className="space-y-2.5">
                {(tournament.standings ?? []).map((row, idx) => (
                  <div
                    key={row.username + idx}
                    className={`flex justify-between items-center p-3 rounded-lg border ${
                      idx < tournament.finalistCount
                        ? "bg-slate-800 border-emerald-500/40"
                        : "bg-slate-800/50 border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-200 font-bold">
                        #{idx + 1} {row.username}
                      </span>

                      {idx < tournament.finalistCount && (
                        <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                          Top {tournament.finalistCount}
                        </span>
                      )}
                    </div>

                    <span className="text-emerald-400 font-mono text-sm">
                      {row.progress}% · {row.mistakes} lỗi
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Thanh tiến độ chung kết */}
        {(tournament.status === "Final" ||
          tournament.status === "Closed") && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                🔥 Tiến Độ 6 Tuyển Thủ Chung Kết (Live)
              </h2>

              {tournament.status === "Final" && (
                <span className="font-mono font-bold text-red-600">
                  ⏱️ Còn lại: {formatClock(remainingSeconds)}
                </span>
              )}
            </div>

            <div className="space-y-5">
              {(tournament.standings ?? []).slice(0, 6).map((player, idx) => (
                <div key={player.username + idx}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      #{idx + 1} {player.username}{" "}
                      {player.progress === 100 && "🏁 (Đã về đích)"}
                    </span>

                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                      {player.progress}% · {player.mistakes} lỗi
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-200 dark:border-slate-600">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-4 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, player.progress))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">
          Đang tải dữ liệu giải đấu...
        </div>
      }
    >
      <TournamentDetailContent />
    </Suspense>
  );
}
