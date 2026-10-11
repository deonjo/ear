"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { HoldButton } from "./HoldButton";
import { LockIcon } from "./Icons";

interface GateState {
  unlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

const GateContext = createContext<GateState>({ unlocked: false, unlock: () => {}, lock: () => {} });

/** Remembers in memory (not storage) that a grown-up opened the parent area. A reload, or starting a child session, locks it again. */
export function ParentGateProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const unlock = useCallback(() => setUnlocked(true), []);
  const lock = useCallback(() => setUnlocked(false), []);
  const value = useMemo(() => ({ unlocked, unlock, lock }), [unlocked, unlock, lock]);
  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useParentGate(): GateState {
  return useContext(GateContext);
}

export const PARENT_HOLD_MS = 3000;

/** Shows children only after a 3-second press-and-hold. */
export function ParentGate({ children }: { children: React.ReactNode }) {
  const { unlocked, unlock } = useParentGate();
  if (unlocked) return <>{children}</>;
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold">Parent area</h1>
      <p className="max-w-sm text-muted">Press and hold the button for 3 seconds. (With a keyboard, focus it and hold Space or Enter.)</p>
      <HoldButton
        duration={PARENT_HOLD_MS}
        onComplete={unlock}
        label="Hold for 3 seconds to open the parent area"
        size={112}
        ringColor="var(--accent)"
        className="h-28 w-28 rounded-full bg-accent-soft text-accent"
      >
        <LockIcon className="h-10 w-10" />
      </HoldButton>
    </div>
  );
}
