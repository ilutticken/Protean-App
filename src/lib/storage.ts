import type { AppData } from "./types";

export function blankData(): AppData {
  return {
    version: SCHEMA_VERSION,
    athletes: [],
    activeAthleteId: "",
    sessions: [],
    tests: [],
    perAthlete: {},
    settings: { theme: "dark" },
  };
}

const KEY = "protean-data-v1";
export const SCHEMA_VERSION = 1;

/** Migrations keyed by the version they upgrade FROM. */
const migrations: Record<number, (d: AppData) => AppData> = {};

export function load(seed: () => AppData): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    let data = JSON.parse(raw) as AppData;
    while (data.version < SCHEMA_VERSION) {
      const migrate = migrations[data.version];
      if (!migrate) break;
      data = migrate(data);
    }
    return data;
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
  a.download = `protean-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJson(file: File): Promise<AppData> {
  return file.text().then((t) => {
    const data = JSON.parse(t) as AppData;
    if (typeof data.version !== "number" || !Array.isArray(data.athletes)) {
      throw new Error("Not a Protean backup file");
    }
    return data;
  });
}
