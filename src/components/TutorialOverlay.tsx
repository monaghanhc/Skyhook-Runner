interface TutorialOverlayProps {
  onDismiss: () => void;
}

export function TutorialOverlay({ onDismiss }: TutorialOverlayProps) {
  return (
    <div className="pointer-events-auto max-w-md rounded-3xl border border-cyan-400/30 bg-slate-950/90 px-7 py-8 text-center shadow-2xl backdrop-blur-xl">
      <h3 className="mb-3 text-xl font-bold text-white">First flight briefing</h3>
      <p className="mb-6 text-sm leading-relaxed text-slate-200">
        Swipe to move lanes. Swipe up to jump. Swipe down to slide. Tap glowing anchors to grapple.
      </p>
      <button
        type="button"
        onClick={() => onDismiss()}
        className="w-full rounded-full bg-cyan-500 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
      >
        Start tutorial run
      </button>
    </div>
  );
}
