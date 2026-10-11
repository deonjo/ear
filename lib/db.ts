import Dexie, { type EntityTable } from "dexie";
import type { Profile, SessionRecord } from "./types";

export interface MetaRow {
  key: string;
  value: unknown;
}

/** Everything lives in this browser's IndexedDB. Nothing is ever sent anywhere. */
export class CimDatabase extends Dexie {
  profiles!: EntityTable<Profile, "id">;
  sessions!: EntityTable<SessionRecord, "id">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("chord-flags");
    this.version(1).stores({
      profiles: "id, createdAt",
      sessions: "id, profileId, [profileId+startedAt], dayKey",
      meta: "key",
    });
  }
}

export const db = new CimDatabase();

export const ACTIVE_PROFILE_KEY = "activeProfileId";
