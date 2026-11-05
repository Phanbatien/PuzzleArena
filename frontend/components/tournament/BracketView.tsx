import type { BracketRound, MatchPlayer, MatchResponse } from "@/types/tournament";
import { formatTime } from "@/types/tournament";

function PlayerLine({ player, match, me }: { player: MatchPlayer | null; match: MatchResponse; me: number | null }) {
  if (!player)
    return (
      <div className="flex items-center justify-between px-3 py-2 text-xs italic text-slate-600">
        {match.round === 1 ? "Miễn đấu" : "Chờ người thắng"}
      </div>
    );
  const won = match.winnerId === player.userId;
  const lost = match.winnerId !== null && !won;
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${won ? "font-extrabold text-emerald-200" : lost ? "text-slate-500 line-through" : "text-slate-200"}`}>
      <span className="truncate">
        {player.seed !== null && <span className="mr-1.5 text-[10px] font-bold text-slate-500">#{player.seed}</span>}
        {player.username}
        {player.userId === me && <span className="ml-1.5 text-[10px] font-bold text-amber-300">(bạn)</span>}
      </span>
      {won && <span aria-label="Thắng">✓</span>}
    </div>
  );
}

const MATCH_BORDER: Record<MatchResponse["status"], string> = {
  Pending: "border-slate-800",
  Live: "border-rose-400/50 shadow-[0_0_0_1px_rgba(251,113,133,0.15)]",
  Done: "border-slate-700",
};

// Nhánh đấu: mỗi cột một vòng, trận đang diễn ra viền đỏ.
export default function BracketView({ rounds, me }: { rounds: BracketRound[]; me: number | null }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {rounds.map((round) => (
          <div key={round.round} className="flex w-60 flex-col">
            <div className="mb-3">
              <p className="text-sm font-extrabold text-white">{round.name}</p>
              <p className="text-xs text-slate-500">{formatTime(round.startsAt)}</p>
            </div>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.matches.map((m) => (
                <div key={m.id} className={`overflow-hidden rounded-xl border bg-slate-950/70 ${MATCH_BORDER[m.status]}`}>
                  <PlayerLine player={m.player1} match={m} me={me} />
                  <div className="h-px bg-slate-800" />
                  <PlayerLine player={m.player2} match={m} me={me} />
                  {(m.status === "Live" || m.note) && (
                    <p className={`border-t border-slate-800 px-3 py-1.5 text-[10px] ${m.status === "Live" ? "font-bold text-rose-300" : "text-slate-500"}`}>
                      {m.status !== "Live"
                        ? m.note
                        : m.startedAt
                          ? "● Đang đấu"
                          : `⏳ Phòng chờ: ${Number(m.player1Ready) + Number(m.player2Ready)}/2 đã vào`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
