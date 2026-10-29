"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import PageContainer from "@/components/layout/PageContainer";
import DailyCard from "@/components/daily/DailyCard";
import RatingCard from "@/components/daily/RatingCard";
import MissionCard from "@/components/daily/MissionCard";
import InventoryCard from "@/components/daily/InventoryCard";
import AdminGrantForm from "@/components/daily/AdminGrantForm";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import { ApiError } from "@/lib/api";
import { getBoosters, getDaily, getMissions, getRatings } from "@/lib/daily";
import type {
  DailyPuzzle,
  InventoryItem,
  Mission,
  UserRating,
} from "@/types/game";

// Thứ tự hiển thị độ khó: Dễ -> Vừa -> Khó
const DIFFICULTY_ORDER: Record<string, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

function sortByDifficulty(list: DailyPuzzle[]): DailyPuzzle[] {
  return [...list].sort(
    (a, b) =>
      (DIFFICULTY_ORDER[a.difficulty] ?? 99) -
      (DIFFICULTY_ORDER[b.difficulty] ?? 99),
  );
}

type DailyData = {
  sudoku: DailyPuzzle[];
  minesweeper: DailyPuzzle[];
  ratings: UserRating[];
  missions: Mission[];
  boosters: InventoryItem[];
};

function DailyContent() {
  const { user } = useAuth();

  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Tải cả 5 nguồn dữ liệu cùng lúc khi mở trang (hoặc khi bấm "Thử lại")
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sudoku, minesweeper, ratings, missions, boosters] =
          await Promise.all([
            getDaily("Sudoku"),
            getDaily("Minesweeper"),
            getRatings(),
            getMissions(),
            getBoosters(),
          ]);
        if (cancelled) return;
        setData({
          sudoku: sortByDifficulty(sudoku),
          minesweeper: sortByDifficulty(minesweeper),
          ratings,
          missions,
          boosters,
        });
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Không tải được dữ liệu Daily.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  if (loading) {
    return <Loading text="Đang tải Daily Puzzle..." />;
  }

  if (error || !data) {
    return (
      <ErrorMessage
        message={error ?? "Không tải được dữ liệu Daily."}
        onRetry={handleRetry}
      />
    );
  }

  const hasNoPuzzle = data.sudoku.length === 0 && data.minesweeper.length === 0;

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Đề Daily */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Đề hôm nay
        </h2>
        {hasNoPuzzle ? (
          <p className="text-sm text-slate-600">
            Hôm nay chưa có đề Daily nào.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="mb-3 text-lg font-medium text-slate-700">
                Sudoku
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.sudoku.map((p) => (
                  <DailyCard key={p.id} puzzle={p} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-lg font-medium text-slate-700">
                Dò mìn
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.minesweeper.map((p) => (
                  <DailyCard key={p.id} puzzle={p} />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. Rating */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Xếp hạng của bạn
        </h2>
        {data.ratings.length === 0 ? (
          <p className="text-sm text-slate-600">Chưa có dữ liệu xếp hạng.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.ratings.map((r) => (
              <RatingCard key={r.gameType} rating={r} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Nhiệm vụ */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Nhiệm vụ</h2>
        {data.missions.length === 0 ? (
          <p className="text-sm text-slate-600">Chưa có nhiệm vụ nào.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.missions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Kho bổ trợ */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Kho bổ trợ
        </h2>
        <InventoryCard items={data.boosters} />
      </section>

      {/* 5. Khu admin: chỉ hiện khi là admin */}
      {user?.role === "Admin" && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Khu vực admin
          </h2>
          <AdminGrantForm />
        </section>
      )}
    </div>
  );
}

export default function DailyPage() {
  return (
    <RequireAuth>
      <PageContainer
        title="Daily Puzzle"
        description="Mỗi ngày có đề mới. Giải đề để lên hạng và nhận bổ trợ."
      >
        <DailyContent />
      </PageContainer>
    </RequireAuth>
  );
}
