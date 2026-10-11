"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { ACTIVE_PROFILE_KEY, db } from "./db";
import type { Profile, SessionRecord } from "./types";

export interface ActiveProfileState {
  loading: boolean;
  profiles: Profile[];
  profile: Profile | null;
}

export function useActiveProfile(): ActiveProfileState {
  const result = useLiveQuery(async () => {
    const [profiles, active] = await Promise.all([db.profiles.orderBy("createdAt").toArray(), db.meta.get(ACTIVE_PROFILE_KEY)]);
    const profile = profiles.find((p) => p.id === active?.value) ?? profiles[0] ?? null;
    return { profiles, profile };
  }, []);
  return { loading: result === undefined, profiles: result?.profiles ?? [], profile: result?.profile ?? null };
}

/** All sessions for a profile, oldest first. `undefined` while loading. */
export function useSessions(profileId: string | undefined): SessionRecord[] | undefined {
  const result = useLiveQuery(
    async () => ({
      profileId,
      sessions: profileId ? await db.sessions.where("[profileId+startedAt]").between([profileId, -Infinity], [profileId, Infinity]).toArray() : [],
    }),
    [profileId],
  );
  // Ignore a previous profile's (or the pre-load empty) result while the new query runs.
  return result && result.profileId === profileId ? result.sessions : undefined;
}

/** Current time, refreshed every minute so "today" rolls over on its own. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
