"use client";

import type { Trial } from "@/lib/types";
import { StarIcon } from "../Icons";

/**
 * One mark per planned trial. Answered trials fill in; with stars on, a correct answer
 * earns a gold star. A missed answer simply fills in (never a red mark).
 */
export function ProgressDots({ total, trials, showStars }: { total: number; trials: readonly Trial[]; showStars: boolean }) {
  const correct = trials.filter((t) => t.correct).length;
  return (
    <div
      className="flex max-w-full flex-wrap items-center justify-center"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={trials.length}
      aria-valuetext={`${trials.length} of ${total} done, ${correct} correct`}
    >
      {Array.from({ length: total }, (_, i) => {
        const trial = trials[i];
        const isCurrent = i === trials.length;
        if (trial && trial.correct && showStars) {
          return <StarIcon key={i} className="star-pop m-[1px] h-[20px] w-[20px] text-[#F5B700]" />;
        }
        return (
          <span key={i} className="m-[1px] flex h-[20px] w-[20px] items-center justify-center">
            <span
              className={`block h-[12px] w-[12px] rounded-full border-2 ${
                trial ? "border-[#7d8f78] bg-[#7d8f78]" : isCurrent ? "border-[#56664f] bg-white/80" : "border-[#a9b5a4]"
              }`}
            />
          </span>
        );
      })}
    </div>
  );
}
