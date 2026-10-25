"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

type GameType = "Sudoku" | "Minesweeper";
type Difficulty = "Easy" | "Medium" | "Hard";
type TournamentStatus = "Open" | "Qualifier" | "QualifierDone" | "Final" | "Closed";

interface TournamentItem {
  id: number | string;
  name: string;
  gameType: GameType;
  difficulty: Difficulty;
  status: TournamentStatus;
  finalistCount: number;
  roundMinutes: number;
  participantCount?: number;
}

const MOCK_TOURNAMENTS: TournamentItem[] = [
  {
    id: 1,
    name: "Giải Vô Địch Sudoku Mùa Thu 2026",
    gameType: "Sudoku",
    difficulty: "Hard",
    status: "Qualifier",
    finalistCount: 6,
    roundMinutes: 15,
    participantCount: 32,
  },
  {
    id: 2,
    name: "Thử Thách Tân Binh Sudoku",
    gameType: "Sudoku",
    difficulty: "Easy",
    status: "Open",
    finalistCount: 6,
    roundMinutes: 10,
    participantCount: 18,
  },
  {
    id: 3,
    name: "Siêu Cúp Dò Mìn Mở Rộng",
    gameType: "Minesweeper",
    difficulty: "Medium",
    status: "Closed",
    finalistCount: 6,
    roundMinutes: 15,
    participantCount: 45,
  },
];

const STATUS_LABEL: Record<TournamentStatus, { text: string; badge: string; bar: string }> = {
  Open: {
    text: "Mở đăng ký",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    bar: "bg-sky-500",
  },
  Qualifier: {
    text: "Đang thi Vòng loại",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  QualifierDone: {
    text: "Chờ Chung kết",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    bar: "bg-purple-500",
  },
  Final: {
    text: "Đang thi Chung kết",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    bar: "bg-red-500",
  },
  Closed: {
    text: "Đã kết thúc",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
    bar: "bg-slate-500",
  },
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentItem[]>(MOCK_TOURNAMENTS);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [gameType, setGameType] = useState<GameType>("Sudoku");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [finalistCount, setFinalistCount] = useState(6);
  const [roundMinutes, setRoundMinutes] = useState(15);

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
        // Giữ dữ liệu mẫu khi chưa bật backend
      });

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
  }, []);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập tên giải đấu.");
      return;
    }

    try {
      await api.post("/api/tournaments", {
        name: name.trim(),
        gameType,
        difficulty,
        finalistCount,
        roundMinutes,
      });
      setName("");
      setShowCreateForm(false);
      const updated = await api.get<TournamentItem[]>("/api/tournaments");
      if (Array.isArray(updated)) setTournaments(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setTournaments((prev) => [
          {
            id: Date.now(),
            name: name.trim(),
            gameType,
            difficulty,
            status: "Open",
            finalistCount,
            roundMinutes,
            participantCount: 0,
          },
          ...prev,
        ]);
        setName("");
        setShowCreateForm(false);
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Không thể tạo giải đấu.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              🏆 Giải Đấu Trực Tuyến
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Tranh tài vòng loại cùng đề — Top 6 xuất sắc nhất bước vào Chung kết
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition-colors shadow-sm"
            >
              {showCreateForm ? "Đóng biểu mẫu" : "+ Tạo giải đấu (Admin)"}
            </button>
          )}
        </div>

        {/* Form Tạo Giải Đấu (Chỉ Admin) */}
        {isAdmin && showCreateForm && (
          <form
            onSubmit={handleCreateTournament}
            className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              🛠️ Tạo Giải Đấu Mới
            </h2>
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                {errorMsg}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tên giải đấu
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Giải Sudoku Tuần 4..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Bộ môn (GameType)
                </label>
                <select
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value as GameType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-sm"
                >
                  <option value="Sudoku">Sudoku</option>
                  <option value="Minesweeper">Minesweeper</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Độ khó (Difficulty)
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-sm"
                >
                  <option value="Easy">Easy (Dễ)</option>
                  <option value="Medium">Medium (Vừa)</option>
                  <option value="Hard">Hard (Khó)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Số người CK (Top N)
                </label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={finalistCount}
                  onChange={(e) => setFinalistCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Thời gian / vòng (phút)
                </label>
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={roundMinutes}
                  onChange={(e) => setRoundMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
              >
                Xác nhận tạo giải
              </button>
            </div>
          </form>
        )}

        {/* Danh sách giải đấu */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tourney) => {
            const st = STATUS_LABEL[tourney.status] ?? STATUS_LABEL.Open;
            return (
              <div
                key={tourney.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                <div className={`h-1.5 w-full ${st.bar}`} />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider ${st.badge}`}
                    >
                      {st.text}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded">
                      {tourney.gameType} · {tourney.difficulty}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 line-clamp-2">
                    {tourney.name}
                  </h2>

                  <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 mb-6 flex-1">
                    <p>⏱️ Thời lượng: {tourney.roundMinutes} phút / vòng</p>
                    <p>🏅 Vào chung kết: Top {tourney.finalistCount ?? 6}</p>
                    {tourney.participantCount !== undefined && (
                      <p>👥 Đã đăng ký: {tourney.participantCount} tuyển thủ</p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Link
                      href={`/tournaments/${tourney.id}`}
                      className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-lg font-semibold text-center transition-colors text-sm"
                    >
                      Vào giải đấu →
                    </Link>
                    {isAdmin && (
                      <Link
                        href={`/tournaments/${tourney.id}/monitor`}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-sm"
                        title="Màn hình Giám sát Chung kết (Admin)"
                      >
                        📺
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}