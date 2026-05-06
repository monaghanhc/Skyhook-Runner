import type { HudSnapshot } from "../game/types";

interface HUDProps {
  hud: HudSnapshot;
  tutorialMode?: boolean;
  onPause: () => void;
  musicOn: boolean;
  onToggleMusic: () => void;
  perfMode: boolean;
  onTogglePerf: () => void;
}

export function HUD({
  hud,
  tutorialMode = false,
  onPause,
  musicOn,
  onToggleMusic,
  perfMode,
  onTogglePerf,
}: HUDProps) {
  return (
    <div className="pointer-events-auto flex w-full items-start justify-between gap-3 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur-md sm:text-sm">
        <Stat label="Score" value={hud.score.toString()} accent="text-cyan-200" />
        <Stat label="Coins" value={hud.coins.toString()} accent="text-amber-200" />
        <Stat label="Speed" value={`${hud.speed.toFixed(1)}`} accent="text-fuchsia-200" />
        <Stat
          label={tutorialMode ? "Best (off)" : "Best"}
          value={tutorialMode ? "Not saved" : hud.best.toString()}
          accent="text-emerald-200"
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onToggleMusic}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 backdrop-blur hover:bg-white/10 sm:text-sm"
        >
          Music: {musicOn ? "On" : "Off"}
        </button>
        <button
          type="button"
          onClick={onTogglePerf}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 backdrop-blur hover:bg-white/10 sm:text-sm"
        >
          Perf: {perfMode ? "On" : "Off"}
        </button>
        <button
          type="button"
          onClick={onPause}
          className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-50 backdrop-blur hover:bg-cyan-500/25 sm:text-sm"
        >
          Pause
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wide text-slate-400 sm:text-xs">{label}</span>
      <span className={`font-mono text-sm font-semibold sm:text-base ${accent}`}>{value}</span>
    </div>
  );
}
