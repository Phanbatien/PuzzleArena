
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { USE_MOCK } from "@/lib/config";

type GameType = "Sudoku" | "Minesweeper";
type BoardTab = "rating" | "day" | "week";

interface RatingEntry {
  rank?: number;
  userId?: number | string;
  username: string;
  rating: number;
  solvedCount?: number;
  matches?: number;
}

interface DailyEntry {
  rank?: number;
  userId?: number | string;
  username: string;
  score?: number;
  solvedCount?: number;
  totalDurationMs?: number;
  durationMs?: number;
  mistakes?: number;
}

const MOCK_RATING: Record<GameType, RatingEntry[]> = {
  Sudoku: [
    { rank: 1, username: "player1", rating: 1850, matches: 42 },
    { rank: 2, username: "SudokuMaster99", rating: 1795, matches: 38 },
    { rank: 3, username: "LogicKing", rating: 1710, matches: 31 },
    { rank: 4, username: "GridWalker", rating: 1650, matches: 25 },
    { rank: 5, username: "NumberNinja", rating: 1600, matches: 20 },
  ],
  Minesweeper: [
    { rank: 1, username: "BoomSweeper", rating: 1920, matches: 50 },
    { rank: 2, username: "player1", rating: 1810, matches: 44 },
    { rank: 3, username: "SafeClicker", rating: 1765, matches: 33 },
    { rank: 4, username: "FlagMaster", rating: 1680, matches: 29 },
    { rank: 5, username: "NoExplosions", rating: 1590, matches: 19 },
  ],
};

const MOCK_DAILY: Record<GameType, DailyEntry[]> = {
  Sudoku: [
    { rank: 1, username: "player1", solvedCount: 3, durationMs: 145000, mistakes: 0 },
    { rank: 2, username: "PuzzleQueen", solvedCount: 3, durationMs: 182000, mistakes: 1 },
    { rank: 3, username: "LogicKing", solvedCount: 2, durationMs: 210000, mistakes: 2 },
  ],
  Minesweeper: [
    { rank: 1, username: "BoomSweeper", solvedCount: 3, durationMs: 95000, mistakes: 0 },
    { rank: 2, username: "player1", solvedCount: 2, durationMs: 130000, mistakes: 0 },
    { rank: 3, username: "MineHunter", solvedCount: 2, durationMs: 175000, mistakes: 1 },
  ],
};

const TAB_OPTIONS: { id: BoardTab; label: string; icon: string; description: string }[] = [
  { id: "rating", label: "Hạng Elo", icon: "🏆", description: "Xếp hạng kỹ năng" },
  { id: "day", label: "Top ngày", icon: "📅", description: "Thành tích hôm nay" },
  { id: "week", label: "Top tuần", icon: "🔥", description: "Thành tích tuần này" },
];

function formatTime(ms?: number) {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) return "--:--";

  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}p ${String(seconds).padStart(2, "0")}s`;
}

function getRankStyle(rank: number) {
  switch (rank) {
    case 1:
      return "border-amber-300/40 bg-amber-400/15 text-amber-300";
    case 2:
      return "border-slate-300/30 bg-slate-300/10 text-slate-200";
    case 3:
      return "border-orange-400/30 bg-orange-500/10 text-orange-300";
    default:
      return "border-slate-700 bg-slate-800/70 text-slate-400";
  }
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black ${getRankStyle(rank)}`}
    >
      {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
    </span>
  );
}

export default function LeaderboardPage() {
  const [game, setGame] = useState<GameType>("Sudoku");
  const [tab, setTab] = useState<BoardTab>("rating");
  const [ratingList, setRatingList] = useState<RatingEntry[]>(MOCK_RATING.Sudoku);
  const [dailyList, setDailyList] = useState<DailyEntry[]>(MOCK_DAILY.Sudoku);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!USE_MOCK);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get<{ id: number; username: string; role: string }>("/api/me")
      .then((me) => {
        if (!cancelled && me?.username) {
          setCurrentUsername(me.username);
        }
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          const savedUser = window.localStorage.getItem("puzzlearena_user");

          if (savedUser) {
            try {
              const parsed = JSON.parse(savedUser);
              if (!cancelled && typeof parsed?.username === "string") {
                setCurrentUsername(parsed.username);
              }
            } catch {
              // Bỏ qua dữ liệu người dùng lưu không hợp lệ.
            }
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoadError(false);

      if (USE_MOCK) {
        setRatingList(MOCK_RATING[game]);
        setDailyList(MOCK_DAILY[game]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        if (tab === "rating") {
          const data = await api.get<RatingEntry[]>(
            `/api/leaderboard/rating?game=${game}`,
          );

          if (!cancelled) {
            setRatingList(Array.isArray(data) ? data : []);
          }
        } else {
          const data = await api.get<DailyEntry[]>(
            `/api/leaderboard/daily?game=${game}&period=${tab}`,
          );

          if (!cancelled) {
            setDailyList(Array.isArray(data) ? data : []);
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);

          // Dùng dữ liệu mẫu để trang vẫn có nội dung khi API lỗi.
          setRatingList(MOCK_RATING[game]);
          setDailyList(MOCK_DAILY[game]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [game, tab]);

  const handleSelectGame = (nextGame: GameType) => {
    if (nextGame !== game) {
      setGame(nextGame);
      setLoading(true);
    }
  };

  const handleSelectTab = (nextTab: BoardTab) => {
    if (nextTab !== tab) {
      setTab(nextTab);
      setLoading(true);
    }
  };

  const isRating = tab === "rating";
  const ratingCount = ratingList.length;
  const dailyCount = dailyList.length;

  const topPlayers = isRating
    ? ratingList.slice(0, 3).map((player, index) => ({
        username: player.username,
        value: player.rating.toLocaleString("vi-VN"),
        rank: player.rank ?? index + 1,
        detail: "Elo",
      }))
    : dailyList.slice(0, 3).map((player, index) => ({
        username: player.username,
        value: String(player.solvedCount ?? player.score ?? 0),
        rank: player.rank ?? index + 1,
        detail: "đề hoàn thành",
      }));

  const activeCount = isRating ? ratingCount : dailyCount;

  return (
    <main className="min-h-screen px-3 py-6 sm:px-6 sm:py-9">
      <div className="mx-auto w-full max-w-6xl">
        {/* Hero */}
        <section className="pa-hero mb-7">
          <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <span className="pa-eyebrow">Rankings / Hall of fame</span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Bảng xếp hạng
                <span className="mt-1 block bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                  PuzzleArena
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Chinh phục thử thách, nâng cao Elo và ghi tên bạn lên bảng vàng
                của cộng đồng giải đố.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-2xl">
                ✨
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Chế độ đang xem
                </p>
                <p className="mt-1 font-bold text-white">
                  {game === "Sudoku" ? "🔢 Sudoku" : "💣 Dò mìn"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Chọn game */}
        <section className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-white sm:text-base">
                Chọn trò chơi
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Xem thành tích theo từng bộ môn
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([
              {
                id: "Sudoku",
                icon: "🔢",
                title: "Sudoku",
                subtitle: "Thử thách tư duy logic",
                color: "violet",
              },
              {
                id: "Minesweeper",
                icon: "💣",
                title: "Dò mìn",
                subtitle: "Tìm mìn, tối ưu từng bước",
                color: "cyan",
              },
            ] as const).map((item) => {
              const selected = game === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectGame(item.id)}
                  aria-pressed={selected}
                  className={`group flex min-w-0 items-center gap-4 rounded-2xl border p-4 text-left transition-all sm:p-5 ${
                    selected
                      ? "border-violet-400/60 bg-violet-500/10 shadow-lg shadow-violet-950/20"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900"
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
                      selected
                        ? "bg-violet-500/20"
                        : "bg-slate-800 group-hover:bg-slate-700"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold text-white">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500 sm:text-sm">
                      {item.subtitle}
                    </span>
                  </span>

                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                      selected
                        ? "border-violet-400 bg-violet-500 text-white"
                        : "border-slate-700 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Chọn bảng */}
        <section className="pa-panel mb-6 p-2 sm:p-3">
          <div className="grid grid-cols-3 gap-2">
            {TAB_OPTIONS.map((item) => {
              const selected = tab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  aria-pressed={selected}
                  className={`min-w-0 rounded-xl px-2 py-3 text-center transition-all sm:px-4 ${
                    selected
                      ? "border border-violet-400/30 bg-violet-500/15 text-white shadow-inner"
                      : "border border-transparent text-slate-400 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <span className="block text-lg">{item.icon}</span>
                  <span className="mt-1 block text-xs font-extrabold sm:text-sm">
                    {item.label}
                  </span>
                  <span className="mt-1 hidden text-[11px] text-slate-500 sm:block">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Thống kê */}
        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="pa-stat">
            <p className="pa-stat-label">Bộ môn</p>
            <p className="pa-stat-value text-2xl">
              {game === "Sudoku" ? "🔢 Sudoku" : "💣 Dò mìn"}
            </p>
            <p className="mt-2 text-xs text-slate-500">Bảng xếp hạng riêng</p>
          </div>

          <div className="pa-stat">
            <p className="pa-stat-label">Người chơi xếp hạng</p>
            <p className="pa-stat-value">{loading ? "..." : activeCount}</p>
            <p className="mt-2 text-xs text-slate-500">
              {isRating ? "Theo điểm Elo" : "Theo thành tích"}
            </p>
          </div>

          <div className="pa-stat">
            <p className="pa-stat-label">Bảng đang xem</p>
            <p className="pa-stat-value text-2xl">
              {TAB_OPTIONS.find((item) => item.id === tab)?.label}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {isRating ? "Điểm càng cao, thứ hạng càng tốt" : "Ưu tiên hoàn thành thử thách"}
            </p>
          </div>
        </section>

        {/* Top 3 */}
        {!loading && topPlayers.length > 0 && (
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="text-base font-extrabold text-white">
                🏆 Những người dẫn đầu
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Top 3 trên bảng {TAB_OPTIONS.find((item) => item.id === tab)?.label}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {topPlayers.map((player) => (
                <div
                  key={`${player.username}-${player.rank}`}
                  className={`pa-panel relative overflow-hidden p-5 ${
                    player.rank === 1
                      ? "border-amber-400/30"
                      : player.rank === 2
                        ? "border-slate-400/25"
                        : "border-orange-400/25"
                  }`}
                >
                  <div className="absolute -right-4 -top-5 text-7xl opacity-[0.07]">
                    {player.rank === 1 ? "👑" : player.rank === 2 ? "🥈" : "🥉"}
                  </div>

                  <div className="relative flex items-center gap-3">
                    <RankBadge rank={player.rank} />
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-white">
                        {player.username}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Hạng #{player.rank}
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-5">
                    <span className="text-3xl font-black tracking-tight text-white">
                      {player.value}
                    </span>
                    <span className="ml-2 text-xs font-semibold text-slate-500">
                      {player.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bảng dữ liệu */}
        <section className="pa-panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-extrabold text-white">
                {isRating ? "Bảng xếp hạng Elo" : `Bảng thành tích ${tab === "day" ? "ngày" : "tuần"}`}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {game === "Sudoku" ? "Sudoku" : "Dò mìn"} ·{" "}
                {TAB_OPTIONS.find((item) => item.id === tab)?.description}
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-bold text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              {loading ? "Đang cập nhật" : "Bảng xếp hạng"}
            </span>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-violet-400" />
              <p className="mt-4 font-semibold text-slate-300">
                Đang tải bảng xếp hạng...
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Vui lòng chờ trong giây lát.
              </p>
            </div>
          ) : loadError ? (
            <div className="border-b border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-200 sm:px-6">
              Không thể kết nối bảng xếp hạng. Đang hiển thị dữ liệu mẫu.
            </div>
          ) : null}

          {!loading && isRating && ratingList.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="text-4xl">🏆</span>
              <h3 className="mt-4 font-bold text-white">Chưa có dữ liệu xếp hạng</h3>
              <p className="mt-2 text-sm text-slate-500">
                Hãy chơi một vài trận để xuất hiện trên bảng xếp hạng nhé!
              </p>
            </div>
          ) : null}

          {!loading && !isRating && dailyList.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="text-4xl">🧩</span>
              <h3 className="mt-4 font-bold text-white">Chưa có thành tích</h3>
              <p className="mt-2 text-sm text-slate-500">
                Hoàn thành Daily Puzzle để ghi danh trên bảng này.
              </p>
            </div>
          ) : null}

          {!loading && isRating && ratingList.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="px-5 py-4 text-center sm:px-6">Hạng</th>
                    <th className="px-5 py-4 sm:px-6">Tuyển thủ</th>
                    <th className="px-5 py-4 text-center sm:px-6">Điểm Elo</th>
                    <th className="px-5 py-4 text-center sm:px-6">Số trận</th>
                  </tr>
                </thead>
                <tbody>
                  {ratingList.map((player, index) => {
                    const rank = player.rank ?? index + 1;
                    const isMe =
                      currentUsername !== null &&
                      player.username.toLowerCase() === currentUsername.toLowerCase();

                    return (
                      <tr
                        key={`${player.userId ?? player.username}-${index}`}
                        className={`border-b border-slate-800/80 ${
                          isMe ? "!bg-violet-500/10" : ""
                        }`}
                      >
                        <td className="px-5 py-4 text-center sm:px-6">
                          <RankBadge rank={rank} />
                        </td>
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-bold text-slate-300">
                              {player.username.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-100">
                                {player.username}
                              </p>
                              {rank === 1 && (
                                <span className="text-xs font-semibold text-amber-300">
                                  👑 Nhà vô địch
                                </span>
                              )}
                            </div>
                            {isMe && (
                              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-extrabold text-cyan-300">
                                BẠN
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center sm:px-6">
                          <span className="font-mono text-lg font-black text-cyan-300">
                            {player.rating.toLocaleString("vi-VN")}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center text-sm font-semibold text-slate-300 sm:px-6">
                          {player.solvedCount ?? player.matches ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !isRating && dailyList.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="px-5 py-4 text-center sm:px-6">Hạng</th>
                    <th className="px-5 py-4 sm:px-6">Tuyển thủ</th>
                    <th className="px-5 py-4 text-center sm:px-6">Đề hoàn thành</th>
                    <th className="px-5 py-4 text-center sm:px-6">Tổng thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyList.map((player, index) => {
                    const rank = player.rank ?? index + 1;
                    const isMe =
                      currentUsername !== null &&
                      player.username.toLowerCase() === currentUsername.toLowerCase();

                    return (
                      <tr
                        key={`${player.userId ?? player.username}-${index}`}
                        className={`border-b border-slate-800/80 ${
                          isMe ? "!bg-violet-500/10" : ""
                        }`}
                      >
                        <td className="px-5 py-4 text-center sm:px-6">
                          <RankBadge rank={rank} />
                        </td>
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-bold text-slate-300">
                              {player.username.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-100">
                                {player.username}
                              </p>
                            </div>
                            {isMe && (
                              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-extrabold text-cyan-300">
                                BẠN
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-bold text-emerald-300">
                            {player.solvedCount ?? player.score ?? 0}
                          </span>
                          <span className="ml-1 text-xs text-slate-500">đề</span>
                        </td>
                        <td className="px-5 py-4 text-center font-mono text-sm text-slate-300 sm:px-6">
                          {formatTime(player.totalDurationMs ?? player.durationMs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-800 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>Dữ liệu hiển thị phụ thuộc vào kết quả API của hệ thống.</span>
            <span>Keep playing. Keep improving. ✨</span>
          </div>
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-slate-600">
          Thành tích được cập nhật theo dữ liệu hiện có của PuzzleArena.
        </p>
      </div>
    </main>
  );
}
