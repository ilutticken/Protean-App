import { describe, expect, it } from "vitest";
import { backupDue, BACKUP_NUDGE_DAYS, migrate, SCHEMA_VERSION } from "./storage";
import type { Athlete } from "./types";

const male: Athlete = {
  id: "athlete-a",
  name: "Zen",
  sex: "male",
  bodyweightKg: 78,
  unit: "kg",
  accent: "#00a4c0",
  bodyweightLog: [{ date: "2026-01-02", kg: 78 }],
};

const female: Athlete = {
  id: "athlete-b",
  name: "Fern",
  sex: "female",
  bodyweightKg: 60,
  unit: "kg",
  accent: "#b67c0d",
  bodyweightLog: [{ date: "2026-01-02", kg: 60 }],
};

function v1Blob() {
  return {
    version: 1,
    athletes: [male, female],
    activeAthleteId: "athlete-b",
    sessions: [
      { id: "s1", athleteId: "athlete-a", date: "2026-01-03", dayId: "legs", entries: [] },
      { id: "s2", athleteId: "athlete-b", date: "2026-01-04", dayId: "pull", entries: [] },
      { id: "s3", athleteId: "athlete-b", date: "2026-01-06", dayId: "push", entries: [] },
    ],
    tests: [
      { id: "t1", athleteId: "athlete-a", testId: "broad_jump", date: "2026-01-03", value: 220 },
      { id: "t2", athleteId: "athlete-b", testId: "broad_jump", date: "2026-01-04", value: 180 },
    ],
    perAthlete: {
      "athlete-a": {
        skillProgress: {},
        slotState: { "legs-03": { stepIndex: 2, confirmCount: 1 } },
        slotAlternatives: {},
      },
      "athlete-b": {
        skillProgress: {},
        slotState: { "legs-03": { stepIndex: 1, confirmCount: 0 } },
        slotAlternatives: {},
      },
    },
    settings: { theme: "dark" as const },
  };
}

describe("migrate v1 -> v2 (collapse to one athlete)", () => {
  it("keeps the ACTIVE athlete, not simply the first", () => {
    const d = migrate(v1Blob());
    expect(d.version).toBe(SCHEMA_VERSION);
    expect(d.athlete?.id).toBe("athlete-b");
    expect(d.athlete?.name).toBe("Fern");
  });

  it("keeps only the active athlete's sessions and tests", () => {
    const d = migrate(v1Blob());
    expect(d.sessions.map((s) => s.id)).toEqual(["s2", "s3"]);
    expect(d.tests.map((t) => t.id)).toEqual(["t2"]);
    expect(d.state.slotState["legs-03"].stepIndex).toBe(1);
  });

  it("ARCHIVES the other athlete rather than dropping them", () => {
    const d = migrate(v1Blob());
    expect(d.archived).toHaveLength(1);
    const [other] = d.archived!;
    expect(other.athlete.id).toBe("athlete-a");
    expect(other.sessions.map((s) => s.id)).toEqual(["s1"]);
    expect(other.tests.map((t) => t.id)).toEqual(["t1"]);
    expect(other.state.slotState["legs-03"].stepIndex).toBe(2);
  });

  it("stamps step keys while the chains they were written against are current", () => {
    const d = migrate(v1Blob());
    // legs-03 chain index 1 is the weighted good morning.
    expect(d.state.slotState["legs-03"].stepKey).toBe("hinge.good_morning_weighted");
    expect(d.archived![0].state.slotState["legs-03"].stepKey).toBe("hinge.good_morning");
  });

  it("omits `archived` entirely when there was only ever one athlete", () => {
    const raw = { ...v1Blob(), athletes: [male], activeAthleteId: "athlete-a" };
    expect(migrate(raw).archived).toBeUndefined();
  });

  it("survives a v1 blob saved before onboarding finished", () => {
    const d = migrate({ version: 1, athletes: [], activeAthleteId: "" });
    expect(d.athlete).toBeNull();
    expect(d.sessions).toEqual([]);
    expect(d.state.slotState).toEqual({});
  });
});

describe("migrate — forward compatibility", () => {
  it("leaves an already-current blob alone", () => {
    const current = migrate(v1Blob());
    expect(migrate(current)).toEqual(current);
  });

  it("fills missing collections rather than booting into undefined", () => {
    const d = migrate({ version: SCHEMA_VERSION, athlete: male });
    expect(d.sessions).toEqual([]);
    expect(d.tests).toEqual([]);
    expect(d.state.slotState).toEqual({});
    expect(d.settings.theme).toBe("dark");
  });
});

describe("backupDue — the entire data-loss story", () => {
  it("never nags an empty install", () => {
    expect(backupDue(undefined, "2026-08-04", false)).toBe(false);
  });

  it("nags immediately once there is data and no backup was ever taken", () => {
    expect(backupDue(undefined, "2026-08-04", true)).toBe(true);
  });

  it("stays quiet inside the cadence window", () => {
    expect(backupDue("2026-08-01", "2026-08-04", true)).toBe(false);
    expect(backupDue("2026-07-22", "2026-08-04", true)).toBe(false); // 13 days
  });

  it("nags at exactly the cadence and beyond", () => {
    expect(BACKUP_NUDGE_DAYS).toBe(14);
    expect(backupDue("2026-07-21", "2026-08-04", true)).toBe(true); // 14 days
    expect(backupDue("2026-01-01", "2026-08-04", true)).toBe(true);
  });
});
