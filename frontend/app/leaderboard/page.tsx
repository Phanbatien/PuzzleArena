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

function formatTime(ms?: number) {
  if (!ms && ms !== 0) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}p ${s < 10 ? "0" : ""}${s}s`;
}

export default function LeaderboardPage() {
  const [game, setGame] = useState<GameType>("Sudoku");
  const [tab, setTab] = useState<BoardTab>("rating");
  const [ratingList, setRatingList] = useState<RatingEntry[]>(MOCK_RATING.Sudoku);
  const [dailyList, setDailyList] = useState<DailyEntry[]>(MOCK_DAILY.Sudoku);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!USE_MOCK);

  useEffect(() => {
    api
      .get<{ id: number; username: string; role: string }>("/api/me")
      .then((me) => {
        if (me?.username) setCurrentUsername(me.username);
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          const savedUser = window.localStorage.getItem("puzzlearena_user");
          if (savedUser) {
            try {
              setCurrentUsername(JSON.parse(savedUser).username);
            } catch {
              // Bỏ qua
            }
          }
        }
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      if (USE_MOCK) {
        await Promise.resolve();
        if (!cancelled) {
          setRatingList(MOCK_RATING[game]);
          setDailyList(MOCK_DAILY[game]);
          setLoading(false);
        }
        return;
      }

      try {
        if (tab === "rating") {
          const data = await api.get<RatingEntry[]>(
            `/api/leaderboard/rating?game=${game}`,
          );
          if (!cancelled) setRatingList(Array.isArray(data) ? data : []);
        } else {
          const data = await api.get<DailyEntry[]>(
            `/api/leaderboard/daily?game=${game}&period=${tab}`,
          );
          if (!cancelled) setDailyList(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setRatingList(MOCK_RATING[game]);
          setDailyList(MOCK_DAILY[game]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [game, tab]);

  const handleSelectGame = (g: GameType) => {
    if (g === game) return;
    setLoading(true);
    setGame(g);
  };

  const handleSelectTab = (t: BoardTab) => {
    if (t === tab) return;
    setLoading(true);
    setTab(t);
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <span className="inline-block w-8 h-8 leading-8 bg-yellow-400 text-yellow-900 font-bold rounded-full shadow-sm">
          1
        </span>
      );
    if (rank === 2)
      return (
        <span className="inline-block w-8 h-8 leading-8 bg-slate-300 text-slate-800 font-bold rounded-full shadow-sm">
          2
        </span>
      );
    if (rank === 3)
      return (
        <span className="inline-block w-8 h-8 leading-8 bg-amber-600 text-amber-100 font-bold rounded-full shadow-sm">
          3
        </span>
      );
    return <span className="font-semibold text-slate-500">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
            🏆 Bảng Xếp Hạng PuzzleArena
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Theo dõi thứ hạng Elo toàn máy chủ và thành tích Daily Puzzle mỗi ngày
          </p>
        </div>

        {/* Bộ lọc 1: Chọn Game (Sudoku / Minesweeper) */}
        <div className="flex justify-center gap-3 mb-4">
          {(["Sudoku", "Minesweeper"] as GameType[]).map((g) => (
            <button
              key={g}
              onClick={() => handleSelectGame(g)}
              className={`px-6 py-2.5 font-bold rounded-xl shadow-sm transition-all ${
                game === g
                  ? "bg-sky-600 text-white ring-2 ring-sky-300"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              {g === "Sudoku" ? "🔢 Sudoku" : "💣 Dò mìn (Minesweeper)"}
            </button>
          ))}
        </div>

        {/* Bộ lọc 2: 3 Bảng (Hạng Elo / Top ngày / Top tuần) */}
        <div className="flex justify-center gap-2 mb-6 bg-slate-200/70 dark:bg-slate-800 p-1.5 rounded-xl max-w-md mx-auto">
          {[
            { id: "rating", label: "⭐ Hạng Elo" },
            { id: "day", label: "📅 Top Ngày" },
            { id: "week", label: "🔥 Top Tuần" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id as BoardTab)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                tab === item.id
                  ? "bg-white dark:bg-slate-900 text-sky-600 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Bảng dữ liệu */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-semibold">
              Đang tải bảng xếp hạng...
            </div>
          ) : tab === "rating" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center w-24">
                      Hạng
                    </th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300">
                      Tuyển thủ
                    </th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center">
                      Điểm Elo
                    </th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center">
                      Số đề đã giải
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ratingList.map((player, idx) => {
                    const rank = player.rank ?? idx + 1;
                    const isMe =
                      currentUsername !== null &&
                      player.username.toLowerCase() === currentUsername.toLowerCase();

                    return (
                      <tr
                        key={player.username + idx}
                        className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors ${
                          isMe
                            ? "bg-sky-50 dark:bg-sky-900/30 ring-1 ring-inset ring-sky-400"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/25"
                        }`}
                      >
                        <td className="p-4 text-center">{renderRankBadge(rank)}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                          {player.username}
                          {rank === 1 && (
                            <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                              👑 Top 1
                            </span>
                          )}
                          {isMe && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-sky-600 text-white rounded-full">
                              Bạn
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                          {player.rating}
                        </td>
                        <td className="p-4 text-center text-slate-600 dark:text-slate-400">
                          {player.solvedCount ?? player.matches ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center w-24">
                      Hạng
                    </th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300">
                      Tuyển thủ
                    </th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center">
                      Số đề hoàn thành
                    </th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center">
                      Tổng thời gian
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dailyList.map((player, idx) => {
                    const rank = player.rank ?? idx + 1;
                    const isMe =
                      currentUsername !== null &&
                      player.username.toLowerCase() === currentUsername.toLowerCase();

                    return (
                      <tr
                        key={player.username + idx}
                        className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors ${
                          isMe
                            ? "bg-sky-50 dark:bg-sky-900/30 ring-1 ring-inset ring-sky-400"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/25"
                        }`}
                      >
                        <td className="p-4 text-center">{renderRankBadge(rank)}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                          {player.username}
                          {isMe && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-sky-600 text-white rounded-full">
                              Bạn
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {player.solvedCount ?? player.score ?? 1} đề
                        </td>
                        <td className="p-4 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatTime(player.totalDurationMs ?? player.durationMs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}