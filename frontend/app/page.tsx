import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Hiệu ứng ánh sáng nền rực rỡ */}
      <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Lưới trang trí mờ phía sau */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b15_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Header / Navbar nhỏ */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center border-b border-slate-800/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl p-2 bg-indigo-600/20 rounded-xl border border-indigo-500/30">🧩</span>
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            PuzzleArena
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Đăng nhập
          </Link>
          <Link href="/tournaments" className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 transition-all">
            Vào đấu trường
          </Link>
        </div>
      </header>

      {/* Hero Section chính */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20 text-center flex flex-col items-center">
        {/* Badge thông báo */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-8 animate-pulse">
          <span className="h-2 w-2 rounded-full bg-indigo-400" />
          Mùa giải 2026 chính thức khởi tranh — Chống gian lận tuyệt đối bởi Server Engine
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
          Đấu Trường Trí Tuệ <br className="hidden md:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">
            Đỉnh Cao Trực Tuyến
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Thể hiện bản lĩnh qua các trận chiến <strong className="text-slate-200">Sudoku</strong> và <strong className="text-slate-200">Dò Mìn</strong> kịch tính. Tranh tài vòng loại cùng đề, bứt phá vào Top 6 chung kết!
        </p>

        {/* Nhóm nút hành động chính */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mb-16">
          <Link
            href="/tournaments"
            className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-[0_10px_30px_rgba(79,70,229,0.4)] hover:shadow-[0_15px_35px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>⚔️ Khám Phá Giải Đấu</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>

          <Link
            href="/leaderboard"
            className="px-8 py-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold rounded-2xl border border-slate-800 hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
          >
            🏆 Bảng Xếp Hạng Elo
          </Link>
        </div>

        {/* 3 Thẻ tính năng nhanh (Feature Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 hover:border-indigo-500/50 transition-all group">
            <div className="text-3xl mb-3 p-3 bg-indigo-500/10 rounded-xl w-fit group-hover:scale-110 transition-transform">🔢</div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Sudoku Trọng Tài Server</h3>
            <p className="text-sm text-slate-400">Sinh đề ngẫu nhiên chuẩn xác, đúng 1 lời giải duy nhất. Giới hạn 3 lỗi là thua.</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 hover:border-purple-500/50 transition-all group">
            <div className="text-3xl mb-3 p-3 bg-purple-500/10 rounded-xl w-fit group-hover:scale-110 transition-transform">💣</div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Dò Mìn Đồng Bộ Realtime</h3>
            <p className="text-sm text-slate-400">Vùng xuất phát an toàn cho tất cả người chơi. Giám sát 6 bàn chung kết cùng lúc qua SignalR.</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 hover:border-pink-500/50 transition-all group">
            <div className="text-3xl mb-3 p-3 bg-pink-500/10 rounded-xl w-fit group-hover:scale-110 transition-transform">📊</div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Hệ Thống Elo & Daily</h3>
            <p className="text-sm text-slate-400">Leo rank qua hệ thống Elo chuẩn quốc tế, tích lũy chuỗi ngày và nhận vật phẩm Gợi ý, Khiên.</p>
          </div>
        </div>
      </main>

      {/* Footer nhỏ */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-600 border-t border-slate-900">
        PuzzleArena Platform · Xây dựng bởi Đội ngũ Phát triển Phần mềm (Backend 3 · Frontend 3)
      </footer>
    </div>
  );
}
