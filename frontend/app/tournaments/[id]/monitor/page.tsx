"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { hubConnection, startConnection, stopConnection } from "@/lib/hub";

interface BoardView {
  Game: string;
  Rows: number;
  Cols: number;
  Mines: number;
  Cells: string;
  Givens?: string;
}

// TÁCH NỘI DUNG CHÍNH THÀNH COMPONENT CON
function MonitorContent() {
  const params = useParams();
  const id = params?.id as string;
  
  const [boards, setBoards] = useState<Record<string, BoardView>>({});

  useEffect(() => {
    const initHub = async () => {
      await startConnection();
      if (hubConnection) {
        // hubConnection.invoke("Monitor", id); 
        hubConnection.on("board", (playerId: string, data: BoardView) => {
          setBoards(prev => ({...prev, [playerId]: data}));
        });
      }
    };
    
    initHub();
    return () => { 
      if (hubConnection) hubConnection.off("board");
      stopConnection();
    };
  }, [id]); 

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-6">
          <span className="relative flex h-5 w-5"><span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative rounded-full h-5 w-5 bg-red-600"></span></span>
          LIVE: Màn hình Giám sát Chung kết - ID Giải: {id}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((playerIndex) => {
            const playerId = `player_${playerIndex}`;
            const boardData = boards[playerId];

            return (
              <div key={playerIndex} className="bg-slate-800 rounded-xl border border-slate-700 h-[350px] flex flex-col">
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-700">
                  <span className="font-bold text-slate-200">Tuyển thủ {playerIndex}</span>
                </div>
                
                <div className="flex-1 flex items-center justify-center bg-slate-800">
                  {boardData ? (
                    <div className="text-green-400 text-sm">
                       Dữ liệu live đã nhận: {boardData.Cells.substring(0, 10)}...
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm">Đang đợi kết nối...</div>
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

// COMPONENT CHA: BỌC SUSPENSE
export default function MonitorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center font-bold text-slate-400">Đang khởi tạo kết nối...</div>}>
      <MonitorContent />
    </Suspense>
  );
}