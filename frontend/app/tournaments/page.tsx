"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<{id: string, name: string, status: string, game: string}[]>([]);

  useEffect(() => {
    setTournaments([
      { id: "1", name: "Giải Sudoku Sinh viên", status: "Open", game: "🔢 Sudoku" },
      { id: "2", name: "Giải Dò Mìn Siêu Tốc", status: "Qualifier", game: "💣 Dò Mìn" },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-800">🔥 Danh sách Giải Đấu</h1>
          <button className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
            <span>+</span> Tạo giải (Admin)
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col relative overflow-hidden group">
              {/* Vệt màu chạy ngang khi hover */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                  {t.game}
                </span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${t.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {t.status === 'Open' ? '🟢 Mở đăng ký' : '⚡ Vòng loại'}
                </span>
              </div>
              
              <h2 className="text-xl font-bold text-slate-800 mb-2">{t.name}</h2>
              <p className="text-slate-500 text-sm mb-6 flex-grow">Thể hiện bản lĩnh và leo lên đỉnh vinh quang. Click để xem chi tiết!</p>
              
              <Link href={`/tournaments/${t.id}`} className="block w-full text-center py-3 bg-indigo-50 text-indigo-700 font-semibold rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                Vào thi đấu &rarr;
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}