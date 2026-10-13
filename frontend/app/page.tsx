import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Các khối màu mờ trang trí nền */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>

      <div className="z-10 text-center px-4 max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-6 drop-shadow-sm">
          🧩 PuzzleArena
        </h1>
        <p className="text-lg md:text-xl text-slate-600 mb-10">
          Đấu trường trí tuệ trực tuyến! Thể hiện bản lĩnh qua các trận chiến <strong>Sudoku</strong> và <strong>Dò mìn</strong> kịch tính, công bằng và không khoan nhượng.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/tournaments" className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-bold rounded-full shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_10px_20px_rgba(79,70,229,0.5)] hover:-translate-y-1 transition-all duration-300">
            ⚔️ Khám phá Giải Đấu
          </Link>
          <Link href="/leaderboard" className="px-8 py-4 bg-white text-indigo-700 font-bold rounded-full shadow-lg border border-indigo-100 hover:bg-indigo-50 hover:-translate-y-1 transition-all duration-300">
            🏆 Bảng Xếp Hạng
          </Link>
        </div>
      </div>
    </div>
  );
}