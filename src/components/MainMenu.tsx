import type { LeaderboardEntry } from "../game/leaderboard";
import { LeaderboardPanel } from "./LeaderboardPanel";

interface MainMenuProps {
  onPlay: () => void;
  onTutorial: () => void;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  onRefreshLeaderboard: () => void;
  perfMode: boolean;
  onTogglePerf: () => void;
}

export function MainMenu({
  onPlay,
  onTutorial,
  leaderboard,
  leaderboardLoading,
  leaderboardError,
  onRefreshLeaderboard,
  perfMode,
  onTogglePerf,
}: MainMenuProps) {
  return (
    <div className="pointer-events-auto flex min-h-[42vh] flex-col items-center justify-center px-6 text-center">
      <p className="mb-2 text-xs uppercase tracking-[0.35em] text-cyan-200/80">
        Neon rooftops · Grapple survival
      </p>
      <h1 className="mb-3 bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-amber-200 bg-clip-text text-4xl font-black tracking-tight text-transparent drop-shadow-lg sm:text-5xl">
        Skyhook Runner
      </h1>
      <p className="mb-8 max-w-md text-sm text-slate-300/90">
        Lane swap, vault low beams, slide under lasers, and tap glowing anchors to swing across the void.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onPlay}
          className="rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-10 py-3 text-lg font-semibold text-slate-950 shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110 active:scale-[0.98]"
        >
          Play
        </button>
        <button
          type="button"
          onClick={onTutorial}
          className="rounded-full border border-cyan-300/50 bg-cyan-400/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
        >
          Tutorial Mode
        </button>
        <button
          type="button"
          onClick={onTogglePerf}
          className={`rounded-full border px-6 py-3 text-sm font-medium transition ${
            perfMode
              ? "border-amber-400/70 bg-amber-500/10 text-amber-100"
              : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
          }`}
        >
          Performance mode: {perfMode ? "On" : "Off"}
        </button>
      </div>
      <LeaderboardPanel
        entries={leaderboard}
        loading={leaderboardLoading}
        error={leaderboardError}
        onRefresh={onRefreshLeaderboard}
      />
    </div>
  );
}
