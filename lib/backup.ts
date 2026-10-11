import { db } from "./db";
import { normalizeSettings } from "./repo";
import type { Profile, SessionRecord } from "./types";

export const BACKUP_APP = "chord-flags";
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  profiles: Profile[];
  sessions: SessionRecord[];
}

export async function exportBackup(): Promise<Backup> {
  const [profiles, sessions] = await Promise.all([db.profiles.toArray(), db.sessions.toArray()]);
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), profiles, sessions };
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function isProfile(v: unknown): v is Profile {
  return isObj(v) && typeof v.id === "string" && typeof v.name === "string" && typeof v.createdAt === "number" && Array.isArray(v.events) && v.events.length > 0 && isObj(v.settings);
}

function isSession(v: unknown): v is SessionRecord {
  return (
    isObj(v) &&
    typeof v.id === "string" &&
    typeof v.profileId === "string" &&
    (v.mode === "chords" || v.mode === "piano" || v.mode === "notes") &&
    typeof v.startedAt === "number" &&
    typeof v.dayKey === "string" &&
    Array.isArray(v.trials) &&
    Array.isArray(v.itemsInPlay)
  );
}

/** Validates a parsed backup file and returns its contents, or throws with a parent-readable reason. */
export function parseBackup(data: unknown): { profiles: Profile[]; sessions: SessionRecord[] } {
  if (!isObj(data) || data.app !== BACKUP_APP) throw new Error("This file is not a Chord Flags backup.");
  if (typeof data.version !== "number" || data.version > BACKUP_VERSION) throw new Error("This backup was made by a newer version of the app.");
  if (!Array.isArray(data.profiles) || !Array.isArray(data.sessions)) throw new Error("The backup is missing profiles or sessions.");
  const profiles = data.profiles.filter(isProfile).map((p) => ({ ...p, settings: normalizeSettings(p.settings) }));
  const sessions = data.sessions.filter(isSession);
  if (profiles.length !== data.profiles.length || sessions.length !== data.sessions.length) {
    throw new Error("Some records in the backup are damaged, so nothing was imported.");
  }
  return { profiles, sessions };
}

/** Merges by id: records in the backup overwrite records with the same id; everything else is kept. */
export async function importBackup(data: unknown): Promise<{ profiles: number; sessions: number }> {
  const { profiles, sessions } = parseBackup(data);
  await db.transaction("rw", db.profiles, db.sessions, async () => {
    await db.profiles.bulkPut(profiles);
    await db.sessions.bulkPut(sessions);
  });
  return { profiles: profiles.length, sessions: sessions.length };
}
