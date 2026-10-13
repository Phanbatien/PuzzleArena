"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// TÁCH NỘI DUNG CHÍNH THÀNH COMPONENT CON
function TournamentDetailContent() {
  const params = useParams();
  const id = params?.id as string;

  const [status, setStatus] = useState("Open");
  const [isAdmin, setIsAdmin] = useState(true);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {isAdmin && (
          <div className="bg-slate-900 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center shadow-lg border border-slate-700 text-white">
            <div className="flex items-center gap-2 mb-2 md:mb-0">
              <span className="text-xl">🛠️</span>
              <span className="font-bold text-slate-200">Admin Control Panel</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStatus("Open")} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold">Mở ĐK</button>
              <button onClick={() => setStatus("Qualifier")} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-semibold">Bắt đầu Vòng Loại</button>
              <button onClick={() => setStatus("Final")} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-semibold">Bắt đầu Chung Kết</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div className="flex gap-2 mb-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">🔢 Sudoku</span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase
                ${status === 'Open' ? 'bg-green-100 text-green-700' : 
                  status === 'Qualifier' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                Trạng thái: {status === 'Open' ? 'Mở Đăng Ký' : status === 'Qualifier' ? 'Đang Vòng Loại' : 'Chung Kết'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">Giải Đấu Siêu Trí Tuệ #{id}</h1>
          </div>

          {status === "Open" && (
            <button className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
              📝 Đăng Ký Tham Gia
            </button>
          )}
          {status === "Qualifier" && (
            <button className="px-8 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition animate-pulse">
              🎮 Vào Thi Ngay
            </button>
          )}
          {status === "Final" && (
            <Link href={`/tournaments/${id}/monitor`} className="px-8 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition shadow-lg">
              👀 Xem Giám Sát Chung Kết
            </Link>
          )}
        </div>

        {status === "Qualifier" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
              <p className="text-slate-500 font-semibold mb-2">Đồng hồ đếm ngược</p>
              <p className="text-5xl font-mono font-black text-indigo-600">14:59</p>
              <p className="text-sm text-slate-400 mt-2">Nhanh tay lên, chỉ lấy top 6!</p>
            </div>
            <div className="md:col-span-2 bg-slate-900 rounded-2xl p-6 shadow-lg">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative rounded-full h-3 w-3 bg-red-500"></span></span>
                Bảng xếp hạng vòng loại (Live)
              </h2>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <span className="text-slate-300 font-semibold">#{i} Người chơi {i}</span>
                    <span className="text-green-400 font-mono text-sm">{Math.floor(Math.random() * 20) + 10} phút - 0 lỗi</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {status === "Final" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-2xl">🔥</span> Thanh Tiến Độ 6 Người Chung Kết
            </h2>
            <div className="space-y-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-slate-700">Tuyển thủ {i}</span>
                    <span className="font-mono text-indigo-600 font-semibold">{i * 15}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-500" style={{ width: `${i * 15}%` }}></div>
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

// COMPONENT CHA: BỌC SUSPENSE THEO LUẬT CỦA NEXT.JS 16
export default function TournamentDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-slate-500">Đang tải dữ liệu...</div>}>
      <TournamentDetailContent />
    </Suspense>
  );
}