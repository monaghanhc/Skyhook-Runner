interface PauseOverlayProps {
  onResume: () => void;
  onMenu: () => void;
}

export function PauseOverlay({ onResume, onMenu }: PauseOverlayProps) {
  return (
    <div className="pointer-events-auto flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-950/80 px-8 py-10 text-center shadow-2xl backdrop-blur-xl">
      <h2 className="mb-2 text-2xl font-bold text-white">Paused</h2>
      <p className="mb-6 max-w-sm text-sm text-slate-300">Take a breath. The rooftops will wait.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onResume}
          className="rounded-full bg-cyan-500 px-8 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Resume
        </button>
        <button
          type="button"
          onClick={onMenu}
          className="rounded-full border border-white/20 px-8 py-2.5 text-sm font-medium text-slate-100 hover:bg-white/5"
        >
          Main menu
        </button>
      </div>
    </div>
  );
}
