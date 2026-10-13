"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { BoardView } from "@/types/game";
import SudokuBoard from "@/components/SudokuBoard";

function MonitorContent() {
  const params = useParams();
  const id = params?.id as string;
  const [boards, setBoards] = useState<Record<string, BoardView>>({});

  // TẠM THỜI BỎ SIGNALR - DÙNG MOCK DATA ĐỂ TEST UI
  useEffect(() => {
    const interval = setInterval(() => {
      setBoards(prev => {
        const newBoards = { ...prev };
        // Mô phỏng 6 tuyển thủ đang chơi
        for (let i = 1; i <= 6; i++) {
          const playerId = `player_${i}`;
          
          // Tạo chuỗi 81 số ngẫu nhiên từ 0-9 (0 là ô trống) để test UI bàn chơi
          const fakeCells = Array.from({ length: 81 }, () => Math.floor(Math.random() * 10).toString()).join('');
          const fakeGivens = Array.from({ length: 81 }, () => (Math.random() > 0.7 ? "1" : "0")).join('');
          
          newBoards[playerId] = {
            game: "Sudoku",
            rows: 9,
            cols: 9,
            mines: 0,
            cells: fakeCells,
            givens: fakeGivens
          };
        }
        return newBoards;
      });
    }, 2000); // Cứ 2 giây dữ liệu nhảy 1 lần giống hệt lúc thi đấu thật

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-6">
          <span className="relative flex h-5 w-5">
            <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative rounded-full h-5 w-5 bg-red-600"></span>
          </span>
          LIVE: Màn hình Giám sát Chung kết - ID Giải: {id}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((playerIndex) => {
            const playerId = `player_${playerIndex}`;
            const boardData = boards[playerId];

            return (
              <div key={playerIndex} className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden shadow-lg">
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-slate-200">Tuyển thủ {playerIndex}</span>
                  {boardData ? (
                    <span className="text-xs font-mono text-green-400 bg-green-400/10 px-2 py-1 rounded">Đang thi đấu</span>
                  ) : (
                    <span className="text-xs font-mono text-slate-400 bg-slate-700 px-2 py-1 rounded">Đợi...</span>
                  )}
                </div>
                
                <div className="flex-1 flex items-center justify-center bg-slate-800 p-4 min-h-[350px]">
                  {boardData ? (
                    <div className="scale-[0.8] origin-top transition-all duration-300">
                      <SudokuBoard
                        cells={boardData.cells}
                        givens={boardData.givens}
                        readOnly={true}
                      /> 
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm flex flex-col items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MonitorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center font-bold text-slate-400">Đang tải...</div>}>
      <MonitorContent />
    </Suspense>
  );
}