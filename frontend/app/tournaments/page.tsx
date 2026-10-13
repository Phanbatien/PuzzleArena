import Link from "next/link";

// MOCK DATA: Dữ liệu giả lập các giải đấu để thiết kế UI
const mockTournaments = [
  {
    id: "1",
    title: "Giải Vô Địch Sudoku Mùa Thu 2026",
    status: "Đang diễn ra",
    participants: 128,
    difficulty: "Hard",
    date: "2026-10-15",
  },
  {
    id: "2",
    title: "Thử Thách Tân Binh - Tuần 3",
    status: "Mở đăng ký",
    participants: 45,
    difficulty: "Easy",
    date: "2026-10-20",
  },
  {
    id: "3",
    title: "Siêu Cúp Minesweeper Tháng 9",
    status: "Đã kết thúc",
    participants: 256,
    difficulty: "Medium",
    date: "2026-09-30",
  }
];

export default function TournamentsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header của trang */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            🏆 Đấu Trường Puzzle
          </h1>
          <button className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition-colors shadow-sm">
            + Tạo giải đấu nội bộ
          </button>
        </div>

        {/* Lưới danh sách giải đấu */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockTournaments.map((tourney) => (
            <div key={tourney.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {/* Thanh màu chỉ thị trạng thái */}
              <div className={`h-1.5 w-full ${
                tourney.status === 'Đang diễn ra' ? 'bg-green-500' :
                tourney.status === 'Mở đăng ký' ? 'bg-sky-500' : 'bg-slate-500'
              }`}></div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider ${
                    tourney.status === 'Đang diễn ra' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    tourney.status === 'Mở đăng ký' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' : 
                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    {tourney.status}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">
                    {tourney.difficulty}
                  </span>
                </div>
                
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 line-clamp-2">
                  {tourney.title}
                </h2>
                
                <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2 mb-6 flex-1">
                  <p className="flex items-center gap-2">
                    📅 Khởi tranh: <span className="font-medium">{tourney.date}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    👥 Tuyển thủ: <span className="font-medium">{tourney.participants}</span>
                  </p>
                </div>

                <div className="flex gap-3 mt-auto">
                  {/* Nút Đăng ký chỉ hiện khi giải đang mở */}
                  {tourney.status === 'Mở đăng ký' && (
                    <button className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-lg font-semibold transition-colors text-sm">
                      Đăng ký ngay
                    </button>
                  )}
                  
                  {/* Nút Giám sát (Link thẳng tới trang Monitor bạn vừa làm xong) */}
                  <Link 
                    href={`/tournaments/${tourney.id}/monitor`}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 py-2.5 rounded-lg font-semibold text-center transition-colors text-sm border border-slate-200 dark:border-slate-600"
                  >
                    Vào phòng chờ
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}