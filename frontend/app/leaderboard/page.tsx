"use client";
import { useState, useEffect } from "react";

export default function LeaderboardPage() {
  const [data, setData] = useState<{id: number, name: string, score: number}[]>([]);
  const [selectedGame, setSelectedGame] = useState("Sudoku");
  const [selectedTab, setSelectedTab] = useState("Hạng");
  
  // Tạm giả lập ID của bạn đang đăng nhập là 3
  const myUserId = 3;

  useEffect(() => {
    // Mock data thay đổi linh hoạt theo Tab (sau này gọi API thật vào đây)
    setData([
      { id: 1, name: "Siêu Trí Tuệ", score: 2500 },
      { id: 2, name: "Thợ Săn Mìn", score: 2150 },
      { id: 3, name: "Quang Huy (Bạn)", score: 1900 }, // Đây là dòng của chính mình
      { id: 4, name: "Người chơi 4", score: 1500 },
      { id: 5, name: "Người chơi 5", score: 1450 }
    ]);
  }, [selectedGame, selectedTab]);

  const getMedal = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return <span className="text-slate-400 font-bold ml-1">#{index + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 mb-2">
            🏆 Bảng Phong Thần
          </h1>
        </div>

        {/* BỘ LỌC TÌM KIẾM */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          {/* Chọn Game */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {["Sudoku", "Minesweeper"].map(game => (
              <button 
                key={game} 
                onClick={() => setSelectedGame(game)}
                className={`px-6 py-2 rounded-md font-semibold transition-all ${selectedGame === game ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {game === "Sudoku" ? "🔢 Sudoku" : "💣 Dò Mìn"}
              </button>
            ))}
          </div>

          {/* Chọn 3 Bảng (Hạng / Ngày / Tuần) */}
          <div className="flex gap-2">
            {["Hạng", "Top Ngày", "Top Tuần"].map(tab => (
              <button 
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-2 border-b-2 font-bold transition-colors ${selectedTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        {/* BẢNG DỮ LIỆU */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-sm font-bold">
              <tr>
                <th className="p-4 text-center w-24">Hạng</th>
                <th className="p-4">Tuyển thủ</th>
                <th className="p-4 text-right pr-8">{selectedTab === "Hạng" ? "Điểm Elo" : "Thời gian giải"}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user, index) => {
                const isMe = user.id === myUserId;
                return (
                  <tr 
                    key={user.id} 
                    // NỔI BẬT DÒNG CỦA CHÍNH MÌNH 
                    className={`border-b border-slate-50 transition-colors 
                      ${isMe ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : (index < 3 ? 'bg-amber-50/30' : 'hover:bg-slate-50')}
                    `}
                  >
                    <td className="p-4 text-center text-2xl">{getMedal(index)}</td>
                    <td className="p-4">
                      <span className={`text-lg ${isMe ? 'font-bold text-indigo-700' : 'font-semibold text-slate-800'}`}>
                        {user.name}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-8 font-black text-indigo-600 text-xl">{user.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}