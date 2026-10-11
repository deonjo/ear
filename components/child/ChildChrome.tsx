"use client";

import { HoldButton } from "../HoldButton";
import { AgainIcon, CloseIcon, HomeIcon, PlayIcon, ReplayIcon, StarIcon } from "../Icons";

export const END_HOLD_MS = 1500;

/** Top bar: hold-to-end (for the parent), progress, replay. Icons only. */
export function ChildTopBar({
  onEnd,
  onReplay,
  canReplay,
  children,
}: {
  onEnd: () => void;
  onReplay: () => void;
  canReplay: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 pt-3">
      <HoldButton
        duration={END_HOLD_MS}
        onComplete={onEnd}
        label="Hold to end the session"
        size={48}
        ringColor="#56664f"
        className="h-12 w-12 shrink-0 rounded-full bg-white/50 text-[#56664f]"
      >
        <CloseIcon className="h-5 w-5" />
      </HoldButton>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        aria-label="Play the sound again"
        onClick={onReplay}
        disabled={!canReplay}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#3f4a3c] shadow-sm transition-opacity disabled:opacity-30"
      >
        <ReplayIcon className="h-7 w-7" />
      </button>
    </div>
  );
}

/** Big play button shown before the first trial; the tap also unlocks audio on iOS. */
export function StartOverlay({ loading, error, onStart }: { loading: boolean; error: boolean; onStart: () => void }) {
  return (
    <div className="fade-in absolute inset-0 z-10 flex items-center justify-center bg-[#edf1ea]/60 backdrop-blur-[2px]">
      {error ? (
        <div role="alert" className="max-w-xs rounded-2xl bg-white p-5 text-center text-[#3f4a3c] shadow">
          <p className="font-semibold">The piano sounds could not load.</p>
          <p className="mt-1 text-sm">Open the app once while online so they can be saved for offline use, then try again.</p>
          <button type="button" className="mt-4 rounded-xl bg-[#3f4a3c] px-4 py-2 font-semibold text-white" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      ) : loading ? (
        <div role="status" aria-label="Loading piano sounds" className="flex h-36 w-36 items-center justify-center">
          <svg viewBox="0 0 50 50" className="spin-slow h-20 w-20" aria-hidden="true">
            <circle cx="25" cy="25" r="20" fill="none" stroke="#b9c5b3" strokeWidth="5" />
            <path d="M25 5a20 20 0 0 1 20 20" fill="none" stroke="#56664f" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Start"
          onClick={onStart}
          className="flex h-36 w-36 items-center justify-center rounded-full bg-[#56664f] text-white shadow-lg transition-transform active:scale-95"
        >
          <PlayIcon className="ml-2 h-16 w-16" />
        </button>
      )}
    </div>
  );
}

/** "All done": a wordless celebration and the stars earned. */
export function DoneScreen({
  stars,
  showStars,
  children,
  onHome,
  onAgain,
}: {
  stars: number;
  showStars: boolean;
  children: React.ReactNode;
  onHome: () => void;
  onAgain: () => void;
}) {
  return (
    <div className="fade-in flex h-full flex-col items-center justify-center gap-8 overflow-auto p-6">
      <div className="flex flex-wrap items-end justify-center gap-2">{children}</div>
      {showStars && stars > 0 && (
        <div className="flex max-w-xl flex-wrap justify-center gap-1" role="img" aria-label={`${stars} stars`}>
          {Array.from({ length: stars }, (_, i) => (
            <StarIcon key={i} className="star-pop h-9 w-9 text-[#F5B700]" />
          ))}
        </div>
      )}
      <div className="flex gap-6">
        <button type="button" aria-label="Home" onClick={onHome} className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-[#3f4a3c] shadow">
          <HomeIcon className="h-9 w-9" />
        </button>
        <button type="button" aria-label="Play again" onClick={onAgain} className="flex h-20 w-20 items-center justify-center rounded-full bg-[#56664f] text-white shadow">
          <AgainIcon className="h-9 w-9" />
        </button>
      </div>
    </div>
  );
}
