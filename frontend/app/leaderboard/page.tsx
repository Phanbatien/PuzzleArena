"use client"; // Bắt buộc phải có dòng này để dùng trạng thái (state) và sự kiện click
import { useState } from "react";

// Tách riêng dữ liệu giả cho 2 game Sudoku và Minesweeper
const mockLeaderboard = {
  Sudoku: [
    { rank: 1, username: "SudokuMaster99", rating: 2850, winRate: "92%", matches: 156 },
    { rank: 2, username: "PuzzleQueen", rating: 2795, winRate: "88%", matches: 210 },
    { rank: 3, username: "LogicKing", rating: 2710, winRate: "85%", matches: 189 },
    { rank: 4, username: "GridWalker", rating: 2650, winRate: "79%", matches: 145 },
    { rank: 5, username: "NumberNinja", rating: 2600, winRate: "75%", matches: 120 },
  ],
  Minesweeper: [
    { rank: 1, username: "BoomSweeper", rating: 2950, winRate: "95%", matches: 312 },
    { rank: 2, username: "MineHunter", rating: 2810, winRate: "89%", matches: 245 },
    { rank: 3, username: "SafeClicker", rating: 2765, winRate: "86%", matches: 198 },
    { rank: 4, username: "FlagMaster", rating: 2680, winRate: "81%", matches: 167 },
    { rank: 5, username: "NoExplosions", rating: 2590, winRate: "77%", matches: 134 },
  ]
};

export default function LeaderboardPage() {
  // State lưu trữ tab đang được chọn (Mặc định là Sudoku)
  const [activeTab, setActiveTab] = useState<"Sudoku" | "Minesweeper">("Sudoku");
  
  // Lấy danh sách người chơi dựa trên tab đang chọn
  const currentPlayers = mockLeaderboard[activeTab];

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 mb-3">
            🏆 Bảng Xếp Hạng Global
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Tôn vinh những bộ óc vĩ đại nhất của Đấu Trường Puzzle
          </p>
        </div>

        {/* Tab chọn Game có logic đổi màu */}
        <div className="flex justify-center gap-2 mb-6">
          <button 
            onClick={() => setActiveTab("Sudoku")}
            className={`px-6 py-2 font-semibold rounded-lg shadow-sm transition-colors ${
              activeTab === "Sudoku" 
                ? "bg-sky-600 text-white" 
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            Sudoku
          </button>
          
          <button 
            onClick={() => setActiveTab("Minesweeper")}
            className={`px-6 py-2 font-semibold rounded-lg shadow-sm transition-colors ${
              activeTab === "Minesweeper" 
                ? "bg-sky-600 text-white" 
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            Minesweeper
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center w-24">Hạng</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Tuyển thủ</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center">Rating</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center">Tỉ lệ thắng</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center">Số trận</th>
                </tr>
              </thead>
              <tbody>
                {currentPlayers.map((player) => (
                  <tr 
                    key={player.rank} 
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/25 transition-colors"
                  >
                    <td className="p-4 text-center">
                      {player.rank === 1 ? <span className="inline-block w-8 h-8 leading-8 bg-yellow-400 text-yellow-900 font-bold rounded-full shadow-sm">1</span> :
                       player.rank === 2 ? <span className="inline-block w-8 h-8 leading-8 bg-slate-300 text-slate-800 font-bold rounded-full shadow-sm">2</span> :
                       player.rank === 3 ? <span className="inline-block w-8 h-8 leading-8 bg-amber-600 text-amber-100 font-bold rounded-full shadow-sm">3</span> :
                       <span className="font-semibold text-slate-500 dark:text-slate-400">{player.rank}</span>}
                    </td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                      {player.username}
                      {player.rank === 1 && <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">👑 MVP</span>}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                      {player.rating}
                    </td>
                    <td className="p-4 text-center font-medium text-green-600 dark:text-green-400">
                      {player.winRate}
                    </td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-400">
                      {player.matches}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}