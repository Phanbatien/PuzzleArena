"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { HubConnection } from "@microsoft/signalr";

import type { BoardView } from "@/types/game";
import SudokuBoard from "@/components/SudokuBoard";
import { api } from "@/lib/api";
import { startConnection } from "@/lib/hub";

interface FinalistMonitor {
  userId?: number | string;
  username: string;
  progress: number;
  mistakes: number;
  status: "InProgress" | "Solved" | "Failed";
  finishRank?: number;
  board?: BoardView;
}

interface BoardPayload {
  userId?: number | string;
  username?: string;
  board?: BoardView;
  progress?: number;
  mistakes?: number;
  status?: "InProgress" | "Solved" | "Failed";
  finishRank?: number;
}

const MAX_FINALISTS = 6;

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, progress));
}

function getStatusInfo(status: FinalistMonitor["status"]) {
  switch (status) {
    case "Solved":
      return {
        label: "Đã hoàn thành",
        className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        dotClassName: "bg-emerald-400",
      };

    case "Failed":
      return {
        label: "Đã thất bại",
        className: "border-rose-400/20 bg-rose-400/10 text-rose-300",
        dotClassName: "bg-rose-400",
      };

    default:
      return {
        label: "Đang thi đấu",
        className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
        dotClassName: "bg-cyan-400",
      };
  }
}

function getMedal(rank?: number) {
  switch (rank) {
    case 1:
      return { icon: "🥇", label: "Hạng 1" };
    case 2:
      return { icon: "🥈", label: "Hạng 2" };
    case 3:
      return { icon: "🥉", label: "Hạng 3" };
    default:
      return null;
  }
}

function MonitorContent() {
  const params = useParams();
  const id = String(params.id ?? "");

  const [finalists, setFinalists] = useState<FinalistMonitor[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [connectionError, setConnectionError] = useState("");

  const updateFinalist = useCallback((payload: BoardPayload) => {
    setFinalists((previous) => {
      const index = previous.findIndex((item) => {
        const matchesId =
          payload.userId !== undefined &&
          item.userId !== undefined &&
          String(item.userId) === String(payload.userId);

        const matchesUsername =
          Boolean(payload.username) && item.username === payload.username;

        return matchesId || matchesUsername;
      });

      if (index === -1) {
        return previous;
      }

      return previous.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          board: payload.board ?? item.board,
          progress:
            payload.progress !== undefined
              ? clampProgress(payload.progress)
              : item.progress,
          mistakes: payload.mistakes ?? item.mistakes,
          status: payload.status ?? item.status,
          finishRank: payload.finishRank ?? item.finishRank,
        };
      });
    });
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError("Không tìm thấy ID giải đấu.");
      return;
    }

    let active = true;
    let connection: HubConnection | null = null;
    let boardHandler: ((payload: BoardPayload) => void) | null = null;
    let connectionStateHandler: (() => void) | null = null;
    let reconnectHandler: (() => void) | null = null;

    async function initialize() {
      setLoading(true);
      setLoadError("");
      setConnectionError("");

      // Tải danh sách người chơi từ API.
      try {
        const data = await api.get<FinalistMonitor[]>(
          `/api/tournaments/${id}/monitor`,
        );

        if (!active) return;

        if (Array.isArray(data)) {
          setFinalists(
            data.slice(0, MAX_FINALISTS).map((item) => ({
              ...item,
              progress: clampProgress(Number(item.progress) || 0),
              mistakes: Number(item.mistakes) || 0,
            })),
          );
        } else {
          setFinalists([]);
          setLoadError("Dữ liệu giám sát không hợp lệ.");
        }
      } catch (error) {
        if (!active) return;

        console.error("Không thể tải dữ liệu giám sát:", error);
        setLoadError(
          "Không thể tải danh sách người chơi. Vui lòng thử tải lại trang.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }

      // Kết nối SignalR để nhận dữ liệu trực tiếp.
      try {
        const conn = await startConnection();

        if (!conn || !active) return;

        connection = conn;

        boardHandler = (payload: BoardPayload) => {
          if (!active || !payload) return;
          updateFinalist(payload);
        };

        connectionStateHandler = () => {
          if (active) {
            setConnected(true);
            setConnectionError("");
          }
        };

        reconnectHandler = () => {
          if (active) {
            setConnected(false);
            setConnectionError("Đang kết nối lại máy chủ...");
          }
        };

        conn.on("board", boardHandler);
        conn.onreconnected(connectionStateHandler);
        conn.onreconnecting(reconnectHandler);
        conn.onclose(reconnectHandler);

        await conn.invoke("Monitor", Number(id) || id);

        if (active) {
          setConnected(true);
          setConnectionError("");
        }
      } catch (error) {
        if (!active) return;

        console.error("Không thể kết nối SignalR:", error);
        setConnected(false);
        setConnectionError(
          "Chưa kết nối được dữ liệu trực tiếp. Vui lòng kiểm tra máy chủ.",
        );
      }
    }

    void initialize();

    return () => {
      active = false;

      if (connection && boardHandler) {
        connection.off("board", boardHandler);
      }

      if (connection && connectionStateHandler) {
        connection.off("reconnected", connectionStateHandler);
      }

      if (connection && reconnectHandler) {
        connection.off("reconnecting", reconnectHandler);
        connection.off("close", reconnectHandler);
      }
    };
  }, [id, updateFinalist]);

  const stats = useMemo(() => {
    return {
      total: finalists.length,
      playing: finalists.filter((item) => item.status === "InProgress").length,
      completed: finalists.filter((item) => item.status === "Solved").length,
      failed: finalists.filter((item) => item.status === "Failed").length,
    };
  }, [finalists]);

  return (
    <main className="pa-page min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/tournaments" className="transition hover:text-cyan-300">
            Giải đấu
          </Link>
          <span>/</span>
          <Link
            href={`/tournaments/${id}`}
            className="transition hover:text-cyan-300"
          >
            Chi tiết giải đấu
          </Link>
          <span>/</span>
          <span className="font-medium text-violet-200">Màn hình giám sát</span>
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-violet-950/20 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">
                  PuzzleArena
                </span>

                <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-200">
                  <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                  Live Monitor
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Màn hình giám sát
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Theo dõi bàn chơi, tiến độ và trạng thái của các thí sinh
                  trong thời gian thực.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  Mã giải:{" "}
                  <span className="font-bold text-slate-200">{id}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${
                    connected
                      ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                      : "border-amber-400/20 bg-amber-400/5 text-amber-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      connected ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  {connected
                    ? "Đã kết nối trực tiếp"
                    : "Chưa kết nối trực tiếp"}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href={`/tournaments/${id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-violet-400/30 hover:bg-violet-500/10"
              >
                <span aria-hidden="true">←</span>
                Quay lại giải đấu
              </Link>
            </div>
          </div>
        </section>

        {/* Thông báo */}
        {connectionError && (
          <div
            role="status"
            className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-200"
          >
            {connectionError}
          </div>
        )}

        {loadError && !loading && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5"
          >
            <p className="font-bold text-rose-200">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-xl border border-rose-400/20 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-400/10"
            >
              Tải lại trang
            </button>
          </div>
        )}

        {/* Thống kê */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Người chơi"
            value={loading ? "—" : String(stats.total).padStart(2, "0")}
            description="Đang được giám sát"
            icon="♟"
            accent="violet"
          />

          <StatCard
            label="Đang thi đấu"
            value={loading ? "—" : String(stats.playing).padStart(2, "0")}
            description="Chưa hoàn thành"
            icon="◉"
            accent="cyan"
          />

          <StatCard
            label="Đã hoàn thành"
            value={loading ? "—" : String(stats.completed).padStart(2, "0")}
            description="Đã giải xong"
            icon="✓"
            accent="emerald"
          />

          <StatCard
            label="Thất bại"
            value={loading ? "—" : String(stats.failed).padStart(2, "0")}
            description="Không hoàn thành"
            icon="!"
            accent="rose"
          />
        </section>

        {/* Tiêu đề danh sách */}
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                Real-time overview
              </p>
              <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                Bàn chơi thí sinh
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Tối đa 6 người chơi được hiển thị trên màn hình này.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "animate-pulse bg-emerald-400" : "bg-slate-600"
                }`}
              />
              {connected ? "Đang nhận dữ liệu" : "Đang chờ dữ liệu"}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: MAX_FINALISTS }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-3xl border border-white/10 bg-slate-950 p-5"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 rounded bg-white/10" />
                      <div className="h-3 w-1/3 rounded bg-white/5" />
                    </div>
                  </div>
                  <div className="mb-4 h-3 w-full rounded bg-white/5" />
                  <div className="aspect-square rounded-2xl bg-white/[0.03]" />
                </div>
              ))}
            </div>
          ) : finalists.length === 0 && !loadError ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/70 px-5 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-3xl text-violet-200">
                ♟
              </div>
              <h3 className="text-lg font-bold text-white">
                Chưa có người chơi
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Hiện chưa có dữ liệu thí sinh để giám sát. Danh sách sẽ hiển thị
                khi API trả về người chơi của giải đấu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {finalists.map((finalist, index) => {
                const status = getStatusInfo(finalist.status);
                const medal = getMedal(finalist.finishRank);
                const progress = clampProgress(finalist.progress);

                return (
                  <article
                    key={String(finalist.userId ?? finalist.username)}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-xl shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/25 hover:shadow-violet-950/10"
                  >
                    {/* Card header */}
                    <div className="border-b border-white/[0.07] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-cyan-400/10 text-lg font-black text-violet-200">
                            {medal ? (
                              <span className="text-2xl">{medal.icon}</span>
                            ) : (
                              String(index + 1).padStart(2, "0")
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-white transition group-hover:text-violet-200">
                              {finalist.username}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {medal ? medal.label : `Thí sinh #${index + 1}`}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${status.className}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`}
                          />
                          {status.label}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                          <span className="text-slate-400">Tiến độ giải</span>
                          <span className="font-black tabular-nums text-white">
                            {progress}%
                          </span>
                        </div>

                        <div
                          className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
                          role="progressbar"
                          aria-label={`Tiến độ của ${finalist.username}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progress}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              finalist.status === "Solved"
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-300"
                                : finalist.status === "Failed"
                                  ? "bg-gradient-to-r from-rose-500 to-rose-300"
                                  : "bg-gradient-to-r from-violet-500 to-cyan-300"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Board */}
                    <div className="p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                          Live game board
                        </span>
                        <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-bold text-slate-400">
                          Sudoku
                        </span>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B1020] p-2 sm:p-3">
                        {finalist.board &&
                        typeof finalist.board.cells === "string" &&
                        typeof finalist.board.givens === "string" ? (
                          <div className="mx-auto flex w-full justify-center">
                            <SudokuBoard
                              cells={finalist.board.cells}
                              givens={finalist.board.givens}
                              readOnly
                              compact
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-square flex-col items-center justify-center gap-3 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/5 text-2xl text-violet-200">
                              ▦
                            </div>
                            <p className="text-sm font-semibold text-slate-300">
                              Chưa có dữ liệu bàn chơi
                            </p>
                            <p className="max-w-[220px] text-xs leading-5 text-slate-500">
                              Bàn chơi sẽ xuất hiện khi máy chủ gửi dữ liệu qua
                              SignalR.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Player statistics */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Số lỗi
                          </p>
                          <p className="mt-1 text-xl font-black tabular-nums text-rose-200">
                            {finalist.mistakes}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Thứ hạng
                          </p>
                          <p className="mt-1 text-xl font-black tabular-nums text-cyan-200">
                            {finalist.finishRank
                              ? `#${finalist.finishRank}`
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer note */}
        <footer className="flex flex-col gap-2 border-t border-white/[0.07] pt-5 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>PuzzleArena · Hệ thống giám sát giải đấu trực tuyến</p>
          <p>Dữ liệu phụ thuộc vào API và kết nối SignalR của máy chủ.</p>
        </footer>
      </div>
    </main>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  description: string;
  icon: string;
  accent: "violet" | "cyan" | "emerald" | "rose";
}

function StatCard({ label, value, description, icon, accent }: StatCardProps) {
  const accentStyles = {
    violet: {
      icon: "border-violet-400/20 bg-violet-400/10 text-violet-200",
      value: "text-violet-200",
    },
    cyan: {
      icon: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
      value: "text-cyan-200",
    },
    emerald: {
      icon: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
      value: "text-emerald-200",
    },
    rose: {
      icon: "border-rose-400/20 bg-rose-400/10 text-rose-200",
      value: "text-rose-200",
    },
  }[accent];

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-4 transition hover:border-white/15 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-400 sm:text-sm">
          {label}
        </p>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-lg ${accentStyles.icon}`}
        >
          {icon}
        </span>
      </div>

      <p
        className={`mt-4 text-3xl font-black tracking-tight tabular-nums ${accentStyles.value}`}
      >
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
        {description}
      </p>
    </div>
  );
}

export default function MonitorPage() {
  return (
    <Suspense
      fallback={
        <main className="pa-page min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="animate-pulse rounded-3xl border border-white/10 bg-slate-950 p-8">
              <div className="h-8 w-64 rounded-lg bg-white/10" />
              <div className="mt-4 h-4 w-96 max-w-full rounded bg-white/5" />
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 rounded-2xl bg-white/[0.04]"
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      }
    >
      <MonitorContent />
    </Suspense>
  );
}
