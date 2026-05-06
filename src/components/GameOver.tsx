interface GameOverProps {
  score: number;
  coins: number;
  best: number;
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOver({ score, coins, best, onRestart, onMenu }: GameOverProps) {
  return (
    <div className="pointer-events-auto flex min-h-[46vh] max-w-lg flex-col items-center justify-center rounded-3xl border border-fuchsia-500/25 bg-slate-950/85 px-8 py-10 text-center shadow-[0_0_60px_-10px_rgba(217,70,239,0.45)] backdrop-blur-xl">
      <p className="mb-1 text-xs uppercase tracking-[0.3em] text-fuchsia-200/80">Run complete</p>
      <h2 className="mb-6 text-3xl font-black text-white sm:text-4xl">Wiped out</h2>
      <div className="mb-8 grid w-full grid-cols-3 gap-3 text-left text-sm">
        <Tile label="Score" value={score} />
        <Tile label="Coins" value={coins} />
        <Tile label="Best" value={best} highlight />
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-10 py-3 text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110"
        >
          Run again
        </button>
        <button
          type="button"
          onClick={onMenu}
          className="rounded-full border border-white/20 px-10 py-3 text-sm font-medium text-slate-100 hover:bg-white/5"
        >
          Main menu
        </button>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2 ${
        highlight ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-mono text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
