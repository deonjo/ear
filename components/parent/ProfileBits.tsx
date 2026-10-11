"use client";

import { useState } from "react";
import { createProfile, setActiveProfile } from "@/lib/repo";
import type { Profile } from "@/lib/types";
import { CheckIcon } from "../Icons";

export function AddProfileForm({ onDone, autoFocus = false }: { onDone?: () => void; autoFocus?: boolean }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true);
        await createProfile(name);
        setName("");
        setBusy(false);
        onDone?.();
      }}
    >
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
        <span className="text-muted">Child&apos;s first name or nickname</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus={autoFocus}
          autoComplete="off"
          className="rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink"
          placeholder="e.g. Bee"
        />
      </label>
      <button type="submit" disabled={!name.trim() || busy} className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-ink disabled:opacity-50">
        Add child
      </button>
    </form>
  );
}

/** Pick which child is practicing. */
export function ProfileSwitcher({ profiles, active }: { profiles: Profile[]; active: Profile }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Child">
        {profiles.map((p) => {
          const on = p.id === active.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => void setActiveProfile(p.id)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 font-medium ${on ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:bg-surface-2"}`}
            >
              {on && <CheckIcon className="h-4 w-4" />}
              {p.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          aria-expanded={adding}
          className="rounded-full border border-dashed border-line px-4 py-2 text-muted hover:bg-surface-2 hover:text-ink"
        >
          + Add child
        </button>
      </div>
      {adding && <AddProfileForm autoFocus onDone={() => setAdding(false)} />}
    </div>
  );
}

/** One circle per session in the daily goal, filled as sessions are completed. */
export function GoalDots({ done, goal }: { done: number; goal: number }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5" role="img" aria-label={`${done} of ${goal} sessions today`}>
      {Array.from({ length: Math.max(goal, done) }, (_, i) => (
        <span
          key={i}
          className={`inline-block h-5 w-5 rounded-full border-2 ${i < done ? (i < goal ? "border-good bg-good" : "border-good bg-good-soft") : "border-line"}`}
        />
      ))}
    </span>
  );
}
