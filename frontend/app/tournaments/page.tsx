
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

type GameType = "Sudoku" | "Minesweeper";
type Difficulty = "Easy" | "Medium" | "Hard";
type TournamentStatus = "Open" | "Qualifier" | "Knockout" | "Closed";

interface TournamentItem {
  id: number | string;
  name: string;
  gameType: GameType;
  difficulty: Difficulty;
  status: TournamentStatus;
  startsAt: string;
  bracketSize: number;
  roundMinutes: number;
  participantCount?: number;
  formatSummary?: string;
}

const BRACKET_SIZES = [4, 8, 16, 32];

// Giá trị cho <input type="datetime-local"> (giờ máy người dùng), mặc định 1 giờ nữa, làm tròn phút.
function defaultStartsAt() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatStart(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MOCK_TOURNAMENTS: TournamentItem[] = [
  {
    id: 1,
    name: "Giải Vô Địch Sudoku Mùa Thu 2026",
    gameType: "Sudoku",
    difficulty: "Hard",
    status: "Knockout",
    startsAt: "2026-11-06T13:00:00Z",
    bracketSize: 16,
    roundMinutes: 15,
    participantCount: 32,
  },
  {
    id: 2,
    name: "Thử Thách Tân Binh Sudoku",
    gameType: "Sudoku",
    difficulty: "Easy",
    status: "Open",
    startsAt: "2026-11-12T12:30:00Z",
    bracketSize: 8,
    roundMinutes: 10,
    participantCount: 18,
  },
  {
    id: 3,
    name: "Siêu Cúp Dò Mìn Mở Rộng",
    gameType: "Minesweeper",
    difficulty: "Medium",
    status: "Closed",
    startsAt: "2026-10-30T14:00:00Z",
    bracketSize: 32,
    roundMinutes: 15,
    participantCount: 45,
  },
];

const STATUS_LABEL: Record<
  TournamentStatus,
  { text: string; badge: string; bar: string; dot: string }
> = {
  Open: {
    text: "Mở đăng ký",
    badge:
      "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    bar: "bg-cyan-400",
    dot: "bg-cyan-300",
  },
  Qualifier: {
    text: "Đang thi vòng loại",
    badge:
      "border-amber-400/20 bg-amber-400/10 text-amber-300",
    bar: "bg-amber-400",
    dot: "bg-amber-300",
  },
  Knockout: {
    text: "Đang đấu loại trực tiếp",
    badge:
      "border-rose-400/20 bg-rose-400/10 text-rose-300",
    bar: "bg-rose-400",
    dot: "bg-rose-300",
  },
  Closed: {
    text: "Đã kết thúc",
    badge:
      "border-slate-600 bg-slate-800/80 text-slate-400",
    bar: "bg-slate-600",
    dot: "bg-slate-500",
  },
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] =
    useState<TournamentItem[]>(MOCK_TOURNAMENTS);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [name, setName] = useState("");
  const [gameType, setGameType] = useState<GameType>("Sudoku");
  const [difficulty, setDifficulty] =
    useState<Difficulty>("Medium");
  const [bracketSize, setBracketSize] = useState(16);
  const [roundMinutes, setRoundMinutes] = useState(10);
  // Đặt giá trị mặc định lúc mở form (không gọi Date.now() khi render: trang này được prerender trên server).
  const [startsAt, setStartsAt] = useState("");
  const [description, setDescription] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "All" | TournamentStatus
  >("All");

  useEffect(() => {
    let active = true;

    api
      .get<TournamentItem[]>("/api/tournaments")
      .then((data) => {
        if (active && Array.isArray(data)) {
          setTournaments(data);
        }
      })
      .catch(() => {
        // Giữ dữ liệu mẫu nếu API chưa khả dụng.
      });

    api
      .get<{ role: string }>("/api/me")
      .then((me) => {
        if (active) {
          setIsAdmin(me?.role === "Admin");
        }
      })
      .catch(() => {
        // Không tự cấp quyền Admin khi API xác thực bị lỗi.
        if (active) {
          setIsAdmin(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleCreateTournament = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập tên giải đấu.");
      return;
    }

    if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) {
      setErrorMsg("Vui lòng chọn giờ bắt đầu.");
      return;
    }

    if (roundMinutes < 1 || roundMinutes > 60) {
      setErrorMsg("Thời gian mỗi trận phải từ 1 đến 60 phút.");
      return;
    }

    setIsCreating(true);

    try {
      await api.post("/api/tournaments", {
        name: name.trim(),
        gameType,
        difficulty,
        startsAt: new Date(startsAt).toISOString(),
        bracketSize,
        roundMinutes,
        description: description.trim(),
      });

      setName("");
      setDescription("");
      setShowCreateForm(false);

      const updated =
        await api.get<TournamentItem[]>("/api/tournaments");

      if (Array.isArray(updated)) {
        setTournaments(updated);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Dự phòng giao diện khi backend chưa khả dụng.
        setTournaments((prev) => [
          {
            id: Date.now(),
            name: name.trim(),
            gameType,
            difficulty,
            status: "Open",
            startsAt: new Date(startsAt).toISOString(),
            bracketSize,
            roundMinutes,
            participantCount: 0,
          },
          ...prev,
        ]);

        setName("");
        setShowCreateForm(false);
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Không thể tạo giải đấu.",
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTournaments =
    statusFilter === "All"
      ? tournaments
      : tournaments.filter(
          (tournament) => tournament.status === statusFilter,
        );

  const openCount = tournaments.filter(
    (tournament) => tournament.status === "Open",
  ).length;

  const runningCount = tournaments.filter(
    (tournament) =>
      tournament.status === "Qualifier" ||
      tournament.status === "Knockout",
  ).length;

  return (
    <main className="relative isolate min-h-screen overflow-hidden text-slate-100">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-[-120px] top-20 h-80 w-80 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute right-[-100px] top-[420px] h-96 w-96 rounded-full bg-cyan-500/[0.08] blur-[130px]" />
      </div>

      <div className="mx-auto w-full max-w-[1320px] px-5 pb-16 pt-8 sm:px-8 lg:px-10 lg:pt-12">
        {/* Page heading */}
        <section className="pa-hero mb-8">
          <div className="relative z-10 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <span className="pa-eyebrow">
                Compete / Tournament hub
              </span>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Giải đấu{" "}
                <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                  trực tuyến
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Đấu loại trực tiếp 1-1: hai người cùng một đề, ai giải xong
                trước đi tiếp. Không tham gia vẫn xem được các trận đang diễn
                ra (trễ 30 giây để giữ công bằng).
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (!startsAt) setStartsAt(defaultStartsAt());
                  setShowCreateForm((previous) => !previous);
                  setErrorMsg(null);
                }}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:brightness-110"
              >
                <span>{showCreateForm ? "−" : "+"}</span>
                {showCreateForm
                  ? "Đóng biểu mẫu"
                  : "Tạo giải đấu"}
              </button>
            )}
          </div>
        </section>

        {/* Overview statistics */}
        <section
          aria-label="Tổng quan giải đấu"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="pa-stat">
            <div className="flex items-center justify-between gap-3">
              <span className="pa-stat-label">Tổng số giải</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-xl">
                🏆
              </span>
            </div>
            <p className="pa-stat-value">{tournaments.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              Giải đấu trong danh sách
            </p>
          </div>

          <div className="pa-stat">
            <div className="flex items-center justify-between gap-3">
              <span className="pa-stat-label">Đang mở đăng ký</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-xl">
                ✦
              </span>
            </div>
            <p className="pa-stat-value text-cyan-300">
              {openCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Có thể đăng ký tham gia
            </p>
          </div>

          <div className="pa-stat">
            <div className="flex items-center justify-between gap-3">
              <span className="pa-stat-label">Đang thi đấu</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 text-xl">
                ⚔️
              </span>
            </div>
            <p className="pa-stat-value text-amber-300">
              {runningCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Vòng loại hoặc nhánh đấu
            </p>
          </div>
        </section>

        {/* Create tournament form */}
        {isAdmin && showCreateForm && (
          <section className="pa-panel mb-8 overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-900/50 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-xl">
                  🛠️
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-white">
                    Tạo giải đấu mới
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Thiết lập thông tin và thể thức thi đấu.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleCreateTournament}
              className="space-y-6 p-5 sm:p-7"
            >
              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200"
                >
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <label
                    htmlFor="tournament-name"
                    className="mb-2 block text-xs font-bold text-slate-300"
                  >
                    Tên giải đấu
                  </label>
                  <input
                    id="tournament-name"
                    type="text"
                    required
                    maxLength={150}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Giải Sudoku tuần 4"
                    className="w-full border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tournament-game"
                    className="mb-2 block text-xs font-bold text-slate-300"
                  >
                    Bộ môn
                  </label>
                  <select
                    id="tournament-game"
                    value={gameType}
                    onChange={(e) =>
                      setGameType(e.target.value as GameType)
                    }
                    className="w-full border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm"
                  >
                    <option value="Sudoku">Sudoku</option>
                    <option value="Minesweeper">Dò Mìn</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="tournament-difficulty"
                    className="mb-2 block text-xs font-bold text-slate-300"
                  >
                    Độ khó
                  </label>
                  <select
                    id="tournament-difficulty"
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(e.target.value as Difficulty)
                    }
                    className="w-full border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm"
                  >
                    <option value="Easy">Dễ — Easy</option>
                    <option value="Medium">Trung bình — Medium</option>
                    <option value="Hard">Khó — Hard</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="tournament-starts"
                    className="mb-2 block text-xs font-bold text-slate-300"
                  >
                    Giờ bắt đầu
                  </label>
                  <input
                    id="tournament-starts"
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Đăng ký đóng lúc này, giải tự bắt đầu.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="tournament-bracket"
                    className="mb-2 block text-xs font-bold text-slate-300"
                  >
                    Số suất nhánh đấu
                  </label>
                  <select
                    id="tournament-bracket"
                    value={bracketSize}
                    onChange={(e) => setBracketSize(Number(e.target.value))}
                    className="w-full border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm"
                  >
                    {BRACKET_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} người
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Đông hơn số này thì có vòng loại trước.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="tournament-duration"
                    className="mb-2 block text-xs font-bold text-slate-300"
                  >
                    Thời gian mỗi trận (phút)
                  </label>
                  <input
                    id="tournament-duration"
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={roundMinutes}
                    onChange={(e) =>
                      setRoundMinutes(Number(e.target.value))
                    }
                    className="w-full border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Từ 1 đến 60 phút, áp dụng cho vòng loại và mỗi trận.
                  </p>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label
                    htmlFor="tournament-description"
                    className="mb-2 block text-xs font-bold text-slate-300"
                  >
                    Luật và hình thức tham gia (không bắt buộc)
                  </label>
                  <textarea
                    id="tournament-description"
                    maxLength={1000}
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ví dụ: Mở cho mọi người chơi. Có mặt trước giờ bắt đầu 5 phút."
                    className="w-full border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setErrorMsg(null);
                  }}
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-extrabold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating
                    ? "Đang xử lý..."
                    : "✓ Xác nhận tạo giải"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Tournament list heading and filters */}
        <section>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="pa-eyebrow">Find your challenge</span>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Danh sách giải đấu
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Tìm giải phù hợp và sẵn sàng tranh tài.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <label
                htmlFor="tournament-filter"
                className="text-xs font-bold text-slate-400"
              >
                Lọc theo trạng thái
              </label>
              <select
                id="tournament-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "All" | TournamentStatus,
                  )
                }
                className="w-full min-w-48 border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm sm:w-auto"
              >
                <option value="All">Tất cả giải đấu</option>
                <option value="Open">Mở đăng ký</option>
                <option value="Qualifier">Đang thi vòng loại</option>
                <option value="Knockout">Đang đấu loại trực tiếp</option>
                <option value="Closed">Đã kết thúc</option>
              </select>
            </div>
          </div>

          {filteredTournaments.length === 0 ? (
            <div className="pa-panel flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-3xl">
                🔎
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-white">
                Chưa có giải đấu phù hợp
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                Thử chọn trạng thái khác để xem danh sách giải đấu.
              </p>
              <button
                type="button"
                onClick={() => setStatusFilter("All")}
                className="mt-5 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20"
              >
                Xem tất cả giải đấu
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredTournaments.map((tourney) => {
                const status =
                  STATUS_LABEL[tourney.status] ?? STATUS_LABEL.Open;

                const isOpen = tourney.status === "Open";

                return (
                  <article
                    key={tourney.id}
                    className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#101629]/90 shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-violet-950/20"
                  >
                    <div
                      className={`h-1 w-full ${status.bar}`}
                    />

                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider ${status.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                          />
                          {status.text}
                        </span>

                        <span className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1.5 text-[10px] font-bold text-slate-300">
                          {tourney.gameType === "Minesweeper"
                            ? "💣 Dò Mìn"
                            : "🔢 Sudoku"}
                        </span>
                      </div>

                      <h3 className="mt-5 min-h-[56px] text-lg font-extrabold leading-7 text-white transition group-hover:text-violet-200">
                        {tourney.name}
                      </h3>

                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                        <span className="rounded-md border border-slate-700/80 bg-slate-900/70 px-2 py-1">
                          Độ khó:{" "}
                          <span className="font-bold text-slate-200">
                            {tourney.difficulty === "Easy"
                              ? "Dễ"
                              : tourney.difficulty === "Medium"
                                ? "Trung bình"
                                : "Khó"}
                          </span>
                        </span>
                      </div>

                      <div className="my-5 h-px bg-slate-800" />

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/[0.08]">
                            ⏱️
                          </span>
                          <div>
                            <p className="text-xs text-slate-500">
                              Bắt đầu · mỗi trận
                            </p>
                            <p className="mt-0.5 text-sm font-bold text-slate-200">
                              {formatStart(tourney.startsAt)} · {tourney.roundMinutes} phút
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-500/[0.08]">
                            🏅
                          </span>
                          <div>
                            <p className="text-xs text-slate-500">
                              Hình thức
                            </p>
                            <p className="mt-0.5 text-sm font-bold text-slate-200">
                              Loại trực tiếp 1-1, tối đa {tourney.bracketSize} người
                            </p>
                          </div>
                        </div>

                        {tourney.participantCount !== undefined && (
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-500/[0.08]">
                              👥
                            </span>
                            <div>
                              <p className="text-xs text-slate-500">
                                Người tham gia
                              </p>
                              <p className="mt-0.5 text-sm font-bold text-slate-200">
                                {tourney.participantCount} tuyển thủ
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto flex gap-2 pt-6">
                        <Link
                          href={`/tournaments/${tourney.id}`}
                          className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-xs font-extrabold transition ${
                            isOpen
                              ? "border border-violet-300/20 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:brightness-110"
                              : "border border-slate-700 bg-slate-900/80 text-slate-200 hover:border-violet-400/40 hover:bg-slate-800"
                          }`}
                        >
                          {isOpen ? "Khám phá & tham gia" : "Xem chi tiết"}
                          <span>→</span>
                        </Link>

                        {(tourney.status === "Qualifier" || tourney.status === "Knockout") && (
                          <Link
                            href={`/tournaments/${tourney.id}/watch`}
                            title="Xem trực tiếp (trễ 30 giây)"
                            aria-label={`Xem trực tiếp ${tourney.name}`}
                            className="inline-flex min-h-11 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 text-lg text-slate-300 transition hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-200"
                          >
                            👁️
                          </Link>
                        )}

                        {isAdmin && (
                          <Link
                            href={`/tournaments/${tourney.id}/monitor`}
                            title="Màn hình giám sát giải đấu"
                            aria-label={`Giám sát ${tourney.name}`}
                            className="inline-flex min-h-11 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 text-lg text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200"
                          >
                            📺
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom note */}
        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-sm font-bold text-slate-200">
                Sẵn sàng cho thử thách tiếp theo?
              </p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                Luyện tập thường xuyên để nâng cao kỹ năng và thành tích.
              </p>
            </div>
          </div>

          <Link
            href="/leaderboard"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
          >
            Xem xếp hạng <span>→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
