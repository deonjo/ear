"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface HoldButtonProps {
  /** How long to hold, in ms. */
  duration: number;
  onComplete: () => void;
  /** Accessible name (also used as tooltip). */
  label: string;
  className?: string;
  children?: React.ReactNode;
  /** Ring color around the button while holding. */
  ringColor?: string;
  size?: number;
}

/**
 * Press-and-hold control. Works with touch, mouse, and keyboard (hold Space or Enter).
 * Used for the parent gate and for ending a session early, so a child's quick tap does nothing.
 */
export function HoldButton({ duration, onComplete, label, className = "", children, ringColor = "currentColor", size = 56 }: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const stop = useCallback(() => {
    startRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (!doneRef.current) setProgress(0);
  }, []);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const start = useCallback(() => {
    if (startRef.current !== null || doneRef.current) return;
    startRef.current = performance.now();
    const tick = () => {
      if (startRef.current === null) return;
      const p = Math.min(1, (performance.now() - startRef.current) / duration);
      setProgress(p);
      if (p >= 1) {
        doneRef.current = true;
        startRef.current = null;
        onCompleteRef.current();
        window.setTimeout(() => {
          doneRef.current = false;
          setProgress(0);
        }, 400);
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [duration]);

  useEffect(() => stop, [stop]);

  const r = size / 2 - 3;
  const circumference = 2 * Math.PI * r;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`relative inline-flex select-none items-center justify-center ${className}`}
      style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") stop();
      }}
      onBlur={stop}
      onClick={(e) => e.preventDefault()}
    >
      <svg className="pointer-events-none absolute inset-0 m-auto -rotate-90" width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeOpacity={0.15} strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      {children}
      <span className="sr-only" aria-live="polite">
        {progress > 0 && progress < 1 ? "Keep holding" : ""}
      </span>
    </button>
  );
}
