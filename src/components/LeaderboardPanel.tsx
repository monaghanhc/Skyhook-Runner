import type { LeaderboardEntry } from "../game/leaderboard";

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function LeaderboardPanel({ entries, loading, error, onRefresh }: LeaderboardPanelProps) {
  return (
    <div className="pointer-events-auto mt-6 w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/65 p-4 text-left backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">Global Top Scores</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border border-white/20 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
        >
          Refresh
        </button>
      </div>
      {loading && <p className="text-xs text-slate-300">Loading leaderboard...</p>}
      {!loading && error && <p className="text-xs text-rose-300">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="text-xs text-slate-400">No online scores yet.</p>
      )}
      {!loading && entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((e, i) => (
            <div
              key={`${e.id}-${i}`}
              className="grid grid-cols-[28px_1fr_auto] gap-2 rounded-md px-2 py-1 text-sm odd:bg-white/5"
            >
              <span className="font-mono text-cyan-200">#{i + 1}</span>
              <span className="truncate text-slate-100">{e.username}</span>
              <span className="font-mono text-amber-200">{e.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
