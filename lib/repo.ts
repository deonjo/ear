import { applyStep, initialEvents, type NextStep } from "./curriculum";
import { dayKey } from "./dates";
import { ACTIVE_PROFILE_KEY, db } from "./db";
import { DEFAULT_SETTINGS, SETTINGS_LIMITS, type Profile, type ProfileSettings, type SessionMode, type SessionRecord, type Trial } from "./types";

export function newId(): string {
  return globalThis.crypto.randomUUID();
}

function clamp(n: number, { min, max }: { min: number; max: number }): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeSettings(input: Partial<ProfileSettings>): ProfileSettings {
  const s = { ...DEFAULT_SETTINGS, ...input };
  return {
    sessionLength: clamp(s.sessionLength, SETTINGS_LIMITS.sessionLength),
    dailyGoal: clamp(s.dailyGoal, SETTINGS_LIMITS.dailyGoal),
    perfectSessionsRequired: clamp(s.perfectSessionsRequired, SETTINGS_LIMITS.perfectSessionsRequired),
    flagPatterns: Boolean(s.flagPatterns),
    stageOrder: s.stageOrder === "black-first" ? "black-first" : "notes-first",
    showStars: Boolean(s.showStars),
  };
}

export async function createProfile(name: string): Promise<Profile> {
  const now = Date.now();
  const profile: Profile = { id: newId(), name: name.trim() || "Child", createdAt: now, settings: { ...DEFAULT_SETTINGS }, events: initialEvents(now) };
  await db.transaction("rw", db.profiles, db.meta, async () => {
    await db.profiles.add(profile);
    await db.meta.put({ key: ACTIVE_PROFILE_KEY, value: profile.id });
  });
  return profile;
}

export async function setActiveProfile(id: string): Promise<void> {
  await db.meta.put({ key: ACTIVE_PROFILE_KEY, value: id });
}

export async function renameProfile(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed) await db.profiles.update(id, { name: trimmed });
}

export async function updateSettings(id: string, patch: Partial<ProfileSettings>): Promise<void> {
  await db.transaction("rw", db.profiles, async () => {
    const profile = await db.profiles.get(id);
    if (!profile) return;
    await db.profiles.update(id, { settings: normalizeSettings({ ...profile.settings, ...patch }) });
  });
}

/** Parent-confirmed progression. Validated against the curriculum so nothing can be skipped. */
export async function confirmStep(id: string, step: NextStep): Promise<void> {
  await db.transaction("rw", db.profiles, async () => {
    const profile = await db.profiles.get(id);
    if (!profile) return;
    await db.profiles.update(id, { events: applyStep(profile.events, step, profile.settings.stageOrder, Date.now()) });
  });
}

/** Clears all progress and history, keeping the name and settings. */
export async function resetProfile(id: string): Promise<void> {
  await db.transaction("rw", db.profiles, db.sessions, async () => {
    await db.sessions.where("profileId").equals(id).delete();
    await db.profiles.update(id, { events: initialEvents(Date.now()) });
  });
}

export async function deleteProfile(id: string): Promise<void> {
  await db.transaction("rw", db.profiles, db.sessions, db.meta, async () => {
    await db.sessions.where("profileId").equals(id).delete();
    await db.profiles.delete(id);
    const active = await db.meta.get(ACTIVE_PROFILE_KEY);
    if (active?.value === id) {
      const other = await db.profiles.orderBy("createdAt").first();
      if (other) await db.meta.put({ key: ACTIVE_PROFILE_KEY, value: other.id });
      else await db.meta.delete(ACTIVE_PROFILE_KEY);
    }
  });
}

export async function startSession(params: { profileId: string; mode: SessionMode; itemsInPlay: string[]; targetCount: number }): Promise<SessionRecord> {
  const now = Date.now();
  const record: SessionRecord = {
    id: newId(),
    profileId: params.profileId,
    mode: params.mode,
    startedAt: now,
    endedAt: now,
    dayKey: dayKey(now),
    targetCount: params.targetCount,
    itemsInPlay: params.itemsInPlay,
    completed: false,
    trials: [],
  };
  await db.sessions.add(record);
  return record;
}

/** Saves after every answer so a session that stops early still counts as a partial. */
export async function saveTrials(sessionId: string, trials: Trial[], completed: boolean): Promise<void> {
  await db.sessions.update(sessionId, { trials, completed, endedAt: Date.now() });
}

/** Drops a session that ended before any answer was given. */
export async function discardIfEmpty(sessionId: string): Promise<void> {
  const session = await db.sessions.get(sessionId);
  if (session && session.trials.length === 0) await db.sessions.delete(sessionId);
}
