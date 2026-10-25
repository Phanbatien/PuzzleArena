
"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import type { HubConnection } from "@microsoft/signalr";
import { BoardView } from "@/types/game";
import SudokuBoard from "@/components/SudokuBoard";
import { api } from "@/lib/api";
import { startConnection } from "@/lib/hub";

interface FinalistMonitor {
  userId?: number | string;
  username: string;
  progress: number;
  mistakes: number;
  status: "InProgress" | "Solved" | "Failed";
  finishRank?: number;
  board?: BoardView;
}

function MonitorContent() {
  const params = useParams();
  const id = params?.id as string;

  const [finalists, setFinalists] = useState<FinalistMonitor[]>([]);
  const [connected, setConnected] = useState<boolean>(false);

  // Tải trạng thái ban đầu của 6 bàn chung kết và kết nối SignalR.
  useEffect(() => {
    let active = true;
    let connection: HubConnection | null = null;

    type BoardPayload = {
      userId?: number | string;
      username?: string;
      board: BoardView;
      progress?: number;
      mistakes?: number;
      status?: "InProgress" | "Solved" | "Failed";
      finishRank?: number;
    };

    let boardHandler:
      | ((payload: BoardPayload) => void)
      | undefined;

    api
      .get<FinalistMonitor[]>(`/api/tournaments/${id}/monitor`)
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setFinalists(data.slice(0, 6));
        }
      })
      .catch(() => {
        if (!active) return;

        // Dữ liệu mẫu khi backend chưa bật.
        const mockFinalists: FinalistMonitor[] = Array.from(
          { length: 6 },
          (_, idx) => ({
            userId: idx + 1,
            username: `player${idx + 1}`,
            progress: idx === 0 ? 100 : (6 - idx) * 15,
            mistakes: idx % 3,
            status: idx === 0 ? "Solved" : "InProgress",
            finishRank: idx === 0 ? 1 : undefined,
            board: {
              game: "Sudoku",
              rows: 9,
              cols: 9,
              mines: 0,
              cells: Array.from({ length: 81 }, (_, c) =>
                idx === 0
                  ? ((c % 9) + 1).toString()
                  : Math.random() > 0.4
                    ? ((c % 9) + 1).toString()
                    : "0",
              ).join(""),
              givens: Array.from({ length: 81 }, (_, c) =>
                c % 3 === 0 ? "1" : "0",
              ).join(""),
            },
          }),
        );

        setFinalists(mockFinalists);
      });

    startConnection()
      .then((conn) => {
        if (!conn || !active) return;

        connection = conn;
        setConnected(true);

        conn.invoke("Monitor", Number(id) || id).catch((err) => {
          console.warn("Không thể bắt đầu giám sát SignalR:", err);
        });

        boardHandler = (payload) => {
          if (!active) return;

          setFinalists((prev) =>
            prev.map((item) => {
              const matched =
                (payload.userId !== undefined &&
                  String(item.userId) === String(payload.userId)) ||
                (payload.username &&
                  item.username === payload.username);

              if (!matched) return item;

              return {
                ...item,
                board: payload.board ?? item.board,
                progress: payload.progress ?? item.progress,
                mistakes: payload.mistakes ?? item.mistakes,
                status: payload.status ?? item.status,
                finishRank: payload.finishRank ?? item.finishRank,
              };
            }),
          );
        };

        conn.on("board", boardHandler);
      })
      .catch((err) => {
        console.warn("Không thể khởi tạo kết nối SignalR:", err);
      });

    return () => {
      active = false;

      if (connection && boardHandler) {
        connection.off("board", boardHandler);
      }
    };
  }, [id]);

  const renderMedal = (rank?: number, status?: string) => {
    if (status !== "Solved" && !rank) return null;

    if (rank === 1) {
      return (
        <span className="px-2.5 py-1 bg-yellow-400 text-yellow-950 font-extrabold text-xs rounded-full shadow">
          🥇 Hạng 1
        </span>
      );
    }

    if (rank === 2) {
      return (
        <span className="px-2.5 py-1 bg-slate-300 text-slate-900 font-extrabold text-xs rounded-full shadow">
          🥈 Hạng 2
        </span>
      );
    }

    if (rank === 3) {
      return (
        <span className="px-2.5 py-1 bg-amber-600 text-amber-100 font-extrabold text-xs rounded-full shadow">
          🥉 Hạng 3
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-full">
        🏁 Hoàn thành
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative rounded-full h-4 w-4 bg-red-600" />
            </span>
            LIVE: Màn Hình Giám Sát Chung Kết (3×2) — Giải #{id}
          </h1>

          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            {connected
              ? "🟢 SignalR Realtime Connected"
              : "🟡 Chế độ Mô phỏng / Chờ kết nối"}
          </span>
        </div>

        {/* Lưới 3x2 hiển thị 6 bàn chơi cùng lúc */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {finalists.map((player, index) => {
            const medal = renderMedal(
              player.finishRank ??
                (player.status === "Solved" ? index + 1 : undefined),
              player.status,
            );

            return (
              <div
                key={player.username + index}
                className={`bg-slate-800 rounded-xl border flex flex-col overflow-hidden shadow-lg transition-all ${
                  player.status === "Solved"
                    ? "border-yellow-400/80 ring-2 ring-yellow-400/30"
                    : player.status === "Failed"
                      ? "border-red-500/60 opacity-80"
                      : "border-slate-700"
                }`}
              >
                {/* Thông tin tuyển thủ */}
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-100">
                      #{index + 1} {player.username}
                    </span>

                    <span className="ml-2 text-xs font-mono text-slate-400">
                      ({player.progress}% · {player.mistakes} lỗi)
                    </span>
                  </div>

                  {medal ? (
                    medal
                  ) : player.status === "Failed" ? (
                    <span className="text-xs font-mono text-red-400 bg-red-400/10 px-2 py-1 rounded">
                      ❌ Quá số lỗi
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                      Đang thi đấu
                    </span>
                  )}
                </div>

                {/* Bàn chơi thu nhỏ, chỉ xem */}
                <div className="flex-1 flex items-center justify-center bg-slate-800 p-3 min-h-[320px]">
                  {player.board ? (
                    <div className="scale-[0.78] origin-center transition-all duration-300">
                      <SudokuBoard
                        cells={player.board.cells}
                        givens={player.board.givens ?? ""}
                        readOnly={true}
                      />
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm">
                      Đang chờ dữ liệu bàn chơi...
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center font-bold text-slate-400">
          Đang tải màn hình giám sát chung kết...
        </div>
      }
    >
      <MonitorContent />
    </Suspense>
  );
}
