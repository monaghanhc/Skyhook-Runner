interface TutorialInGameTipsProps {
  onDismiss: () => void;
}

export function TutorialInGameTips({ onDismiss }: TutorialInGameTipsProps) {
  return (
    <div className="pointer-events-auto mx-3 mt-2 max-w-md self-center rounded-2xl border border-cyan-300/35 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 shadow-xl backdrop-blur-md sm:mt-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
          Tutorial Controls
        </h4>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md border border-white/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-200 hover:bg-white/10"
        >
          Hide
        </button>
      </div>
      <div className="grid gap-1.5 text-xs sm:text-sm">
        <p>
          <span className="font-semibold text-cyan-200">Move:</span> swipe left/right (or A/D,
          arrow keys)
        </p>
        <p>
          <span className="font-semibold text-cyan-200">Jump:</span> swipe up (or Space/Up)
        </p>
        <p>
          <span className="font-semibold text-cyan-200">Slide:</span> swipe down (or S/Down)
        </p>
        <p>
          <span className="font-semibold text-cyan-200">Grapple:</span> tap anchor (or E)
        </p>
      </div>
    </div>
  );
}
