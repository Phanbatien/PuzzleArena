import type { AttemptStatus, BoardView } from "@/types/game";
import type { Difficulty, GameType } from "@/types/common";

// Khớp backend/PuzzleArena.Api/Contracts/TournamentContracts.cs (BE3).
export type TournamentStatus = "Open" | "Qualifier" | "Knockout" | "Closed";
export type MatchStatus = "Pending" | "Live" | "Done";

export type MatchPlayer = { userId: number; username: string; seed: number | null };

export type MatchResponse = {
  id: number;
  round: number;
  slot: number;
  status: MatchStatus;
  player1: MatchPlayer | null;
  player2: MatchPlayer | null;
  winnerId: number | null;
  note: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  player1Ready: boolean;
  player2Ready: boolean;
};

export type BracketRound = { round: number; name: string; startsAt: string | null; matches: MatchResponse[] };

export type ScheduleItem = { name: string; startsAt: string | null; endsAt: string | null; status: "Upcoming" | "Live" | "Done" };

export type StandingRow = {
  rank: number;
  userId: number;
  username: string;
  status: "NotStarted" | AttemptStatus;
  progress: number;
  mistakes: number;
  durationMs: number | null;
  qualified: boolean;
};

export type MyMatch = {
  matchId: number;
  round: number;
  roundName: string;
  status: MatchStatus;
  opponent: MatchPlayer | null;
  won: boolean | null;
  started: boolean; // cả hai đã vào phòng, đã có giờ bắt đầu chung
  ready: boolean; // mình đã vào phòng chờ
  opponentReady: boolean;
  startsAt: string | null;
};

export type TournamentDetail = {
  id: number;
  name: string;
  description: string;
  gameType: GameType;
  difficulty: Difficulty;
  status: TournamentStatus;
  startsAt: string;
  bracketSize: number;
  roundMinutes: number;
  participantCount: number;
  formatSummary: string;
  schedule: ScheduleItem[];
  currentRound: number;
  roundCount: number;
  roundStartsAt: string | null;
  stageEndsAt: string | null;
  serverNow: string;
  spectatorDelaySeconds: number;
  isRegistered: boolean;
  myMatch: MyMatch | null;
  closedNote: string | null;
  standings: StandingRow[];
  bracket: BracketRound[];
  champion: MatchPlayer | null;
};

export type PlayerBoard = {
  userId: number;
  username: string;
  seed: number | null;
  progress: number;
  mistakes: number;
  status: AttemptStatus;
  board: BoardView | null;
};

export type LiveMatch = {
  matchId: number;
  round: number;
  roundName: string;
  status: MatchStatus;
  winnerId: number | null;
  players: PlayerBoard[];
};

export type LiveResponse = {
  tournamentId: number;
  status: TournamentStatus;
  delaySeconds: number;
  asOf: string;
  matches: LiveMatch[];
  qualifier: PlayerBoard[];
};

export type MonitorRow = {
  matchId: number | null;
  userId: number;
  username: string;
  progress: number;
  mistakes: number;
  status: AttemptStatus;
  finishRank: number | null;
  board: BoardView | null;
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { Easy: "Dễ", Medium: "Trung bình", Hard: "Khó" };

export const STATUS_TEXT: Record<TournamentStatus, string> = {
  Open: "Mở đăng ký",
  Qualifier: "Đang thi vòng loại",
  Knockout: "Đang đấu loại trực tiếp",
  Closed: "Đã kết thúc",
};

export function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${String(m).padStart(2, "0")}:${rest}`;
}
