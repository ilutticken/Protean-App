import type { AppData, ArchivedAthlete, Athlete, AthleteState, SessionLog, Slot, TestResult } from "./types";
import { plan } from "../data/prescription";
import { stampAllSlotStates } from "./slot-identity";
import { localISODate } from "./dates";

export function emptyAthleteState(): AthleteState {
  return { skillProgress: {}, slotState: {}, slotAlternatives: {} };
}

export function blankData(): AppData {
  return {
    version: SCHEMA_VERSION,
    athlete: null,
    state: emptyAthleteState(),
    sessions: [],
    tests: [],
    settings: { theme: "dark", tendonPacing: "advisory" },
  };
}

const KEY = "protean-data-v1";
export const SCHEMA_VERSION = 2;

const slotsById: Record<string, Slot> = {};
for (const day of Object.values(plan.days)) {
  for (const slot of day) slotsById[slot.id] = slot;
}

// The v1 (multi-athlete, un-keyed slot state) shape, kept only so the migration
// can read it. Every field is optional: hand-edited or truncated backups exist.
interface V1Data {
  version: number;
  athletes?: Athlete[];
  activeAthleteId?: string;
  sessions?: SessionLog[];
  tests?: TestResult[];
  perAthlete?: Record<string, AthleteState>;
  settings?: AppData["settings"];
}

function stampState(s: AthleteState): AthleteState {
  return { ...s, slotState: stampAllSlotStates(slotsById, s.slotState ?? {}) };
}

/**
 * v1 → v2: collapse the two-athlete schema to one athlete, and capture the
 * meaning of every stored stepIndex as a step key while the chains it was
 * written against are still current (see slot-identity.ts).
 *
 * The non-active athlete is ARCHIVED, never dropped — their partner's history
 * survives the upgrade and can still be exported and imported into their own
 * install.
 */
function v1ToV2(raw: V1Data): AppData {
  const athletes = raw.athletes ?? [];
  const perAthlete = raw.perAthlete ?? {};
  const sessions = raw.sessions ?? [];
  const tests = raw.tests ?? [];
  const active =
    athletes.find((a) => a.id === raw.activeAthleteId) ?? athletes[0] ?? null;

  const archived: ArchivedAthlete[] = athletes
    .filter((a) => a.id !== active?.id)
    .map((a) => ({
      athlete: a,
      state: stampState(perAthlete[a.id] ?? emptyAthleteState()),
      sessions: sessions.filter((s) => s.athleteId === a.id),
      tests: tests.filter((t) => t.athleteId === a.id),
    }));

  return {
    version: 2,
    athlete: active,
    state: stampState(active ? (perAthlete[active.id] ?? emptyAthleteState()) : emptyAthleteState()),
    sessions: active ? sessions.filter((s) => s.athleteId === active.id) : [],
    tests: active ? tests.filter((t) => t.athleteId === active.id) : [],
    settings: { theme: "dark", tendonPacing: "advisory", ...(raw.settings ?? {}) },
    ...(archived.length > 0 ? { archived } : {}),
  };
}

/** Migrations keyed by the version they upgrade FROM. */
const migrations: Record<number, (d: never) => AppData> = {
  1: v1ToV2 as (d: never) => AppData,
};

/**
 * Bring any stored/imported blob up to SCHEMA_VERSION.
 *
 * Migrations are additive by contract: they may re-key or archive data, never
 * discard it. Adding exercises, chain rungs, or skill nodes must NOT need a
 * migration at all — skill progress is derived from the session log, and slot
 * positions survive chain edits via their step keys.
 */
export function migrate(input: unknown): AppData {
  let data = input as AppData;
  while (data.version < SCHEMA_VERSION) {
    const step = migrations[data.version];
    if (!step) break;
    data = step(data as never);
  }
  // Defensive fill: a blob written by a newer build, or a hand-edited one, must
  // not boot into undefined dereferences.
  return {
    ...data,
    state: { ...emptyAthleteState(), ...(data.state ?? {}) },
    sessions: data.sessions ?? [],
    tests: data.tests ?? [],
    settings: {
      theme: "dark",
      tendonPacing: "advisory",
      ...((data.settings ?? {}) as Partial<AppData["settings"]>),
    },
  };
}

export function load(seed: () => AppData): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    return migrate(JSON.parse(raw));
  } catch {
    return seed();
  }
}

/** Returns false when storage is unavailable (private mode, quota) — the app
 * then degrades to in-memory operation instead of crashing. */
export function save(data: AppData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function exportJson(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `protean-backup-${localISODate()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJson(file: File): Promise<AppData> {
  return file.text().then((t) => {
    const raw = JSON.parse(t) as { version?: unknown; athlete?: unknown; athletes?: unknown };
    // Accept every schema this app has ever written; migrate() does the rest.
    const looksLikeProtean =
      typeof raw.version === "number" && ("athlete" in raw || Array.isArray(raw.athletes));
    if (!looksLikeProtean) throw new Error("Not a Protean backup file");
    return migrate(raw);
  });
}
