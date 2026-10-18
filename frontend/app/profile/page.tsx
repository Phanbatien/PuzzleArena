"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import PageContainer from "@/components/layout/PageContainer";
import RatingCard from "@/components/daily/RatingCard";
import HistoryTable from "@/components/profile/HistoryTable";
import ProfileInfoCard from "@/components/profile/ProfileInfoCard";
import ProfileStats from "@/components/profile/ProfileStats";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import { ApiError } from "@/lib/api";
import { getRatings } from "@/lib/daily";
import { getHistory, getMe } from "@/lib/profile";
import type { PlayHistory, UserRating } from "@/types/game";
import type { MeProfile } from "@/types/profile";

type ProfileData = {
  me: MeProfile;
  ratings: UserRating[];
  history: PlayHistory[];
};

function ProfileContent() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Tải 3 nguồn dữ liệu cùng lúc khi mở trang (hoặc khi bấm "Thử lại")
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [me, ratings, history] = await Promise.all([
          getMe(),
          getRatings(),
          getHistory(),
        ]);
        if (cancelled) return;
        setData({ me, ratings, history });
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Không tải được hồ sơ người chơi.",
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
    return <Loading text="Đang tải hồ sơ..." />;
  }

  if (error || !data) {
    return (
      <ErrorMessage
        message={error ?? "Không tải được hồ sơ người chơi."}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <ProfileInfoCard me={data.me} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Thống kê</h2>
        <ProfileStats streak={data.me.streak} history={data.history} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Xếp hạng từng game
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

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Lịch sử chơi
        </h2>
        <HistoryTable history={data.history} />
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <PageContainer
        title="Hồ sơ"
        description="Thông tin tài khoản, xếp hạng và lịch sử các ván đã chơi."
      >
        <ProfileContent />
      </PageContainer>
    </RequireAuth>
  );
}
