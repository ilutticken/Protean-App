import { describe, expect, it } from "vitest";
import { deleteSession, deleteSet, updateSet } from "./history";
import { skillStatuses } from "./selectors";
import { blankData, emptyAthleteState } from "./storage";
import type { Athlete, SessionLog } from "./types";

const base = (): SessionLog[] => [
  {
    id: "s1",
    athleteId: "a",
    date: "2026-08-03",
    dayId: "pull",
    entries: [
      {
        slotId: "pull-05",
        stepIndex: 2,
        exerciseId: "one_arm_pullup.pullup10",
        repBand: 1,
        sets: [{ value: 8 }, { value: 8, weightKg: 10 }, { value: 40 }],
      },
      {
        slotId: "pull-07",
        stepIndex: 0,
        exerciseId: "pull.curl",
        repBand: 0,
        sets: [{ value: 12, weightKg: 20 }],
      },
    ],
  },
  { id: "s2", athleteId: "a", date: "2026-08-04", dayId: "legs", entries: [], isoDone: true },
];

describe("updateSet", () => {
  it("patches one set's value and nothing else", () => {
    const out = updateSet(base(), "s1", 0, 2, { value: 4 });
    expect(out[0].entries[0].sets[2]).toEqual({ value: 4 });
    expect(out[0].entries[0].sets[0]).toEqual({ value: 8 });
    expect(out[0].entries[1].sets[0]).toEqual({ value: 12, weightKg: 20 });
  });

  it("patches and clears weight", () => {
    expect(updateSet(base(), "s1", 0, 1, { weightKg: 12.5 })[0].entries[0].sets[1]).toEqual({
      value: 8,
      weightKg: 12.5,
    });
    expect(updateSet(base(), "s1", 0, 1, { weightKg: null })[0].entries[0].sets[1]).toEqual({
      value: 8,
    });
  });

  it("rejects zero, negative, and non-finite values", () => {
    for (const v of [0, -3, NaN, Infinity]) {
      expect(updateSet(base(), "s1", 0, 2, { value: v })[0].entries[0].sets[2].value).toBe(40);
    }
  });

  it("is a no-op for unknown session ids and never mutates its input", () => {
    const input = base();
    const out = updateSet(input, "ghost", 0, 0, { value: 1 });
    expect(out).toEqual(input);
    updateSet(input, "s1", 0, 2, { value: 4 });
    expect(input[0].entries[0].sets[2].value).toBe(40); // input untouched
  });
});

describe("deleteSet", () => {
  it("removes exactly one set", () => {
    const out = deleteSet(base(), "s1", 0, 2);
    expect(out[0].entries[0].sets).toEqual([{ value: 8 }, { value: 8, weightKg: 10 }]);
  });

  it("prunes an entry emptied of sets", () => {
    const out = deleteSet(base(), "s1", 1, 0);
    expect(out[0].entries).toHaveLength(1);
    expect(out[0].entries[0].exerciseId).toBe("one_arm_pullup.pullup10");
  });

  it("prunes a session emptied of entries — unless iso work keeps it meaningful", () => {
    let out = base();
    out = deleteSet(out, "s1", 1, 0);
    for (const _ of [0, 1, 2]) out = deleteSet(out, "s1", 0, 0);
    expect(out.find((s) => s.id === "s1")).toBeUndefined();
    // s2 has no entries but isoDone: it must survive the pruning rule.
    expect(out.find((s) => s.id === "s2")).toBeDefined();
  });
});

describe("deleteSession", () => {
  it("removes the session and nothing else", () => {
    const out = deleteSession(base(), "s1");
    expect(out.map((s) => s.id)).toEqual(["s2"]);
  });
});

describe("the payoff: fixing the log fixes the derived numbers", () => {
  const athlete: Athlete = {
    id: "a",
    name: "Zen",
    sex: "male",
    bodyweightKg: 80,
    unit: "kg",
    accent: "#00a4c0",
    bodyweightLog: [{ date: "2026-08-01", kg: 80 }],
  };

  it("deleting a fat-fingered set un-achieves the node it falsely unlocked", () => {
    // Three "40-rep pull-up" sets — a mis-tap that satisfies every pull-up rung.
    const sessions: SessionLog[] = [
      {
        id: "s1",
        athleteId: "a",
        date: "2026-08-03",
        dayId: "pull",
        entries: [
          {
            slotId: "pull-05",
            stepIndex: 2,
            exerciseId: "one_arm_pullup.pullup10",
            repBand: 1,
            sets: [{ value: 40 }, { value: 40 }, { value: 40 }],
          },
        ],
      },
    ];
    const before = skillStatuses({ ...blankData(), athlete, sessions }, athlete, emptyAthleteState());
    expect(before["one_arm_pullup.pullup10"].status).toBe("achieved");

    // Fix the log: 40 -> 4 on every set.
    let fixed = sessions;
    for (const si of [0, 1, 2]) fixed = updateSet(fixed, "s1", 0, si, { value: 4 });
    const after = skillStatuses({ ...blankData(), athlete, sessions: fixed }, athlete, emptyAthleteState());
    expect(after["one_arm_pullup.pullup10"].status).not.toBe("achieved");
    // ...but honest partial credit remains.
    expect(after["one_arm_pullup.pullup10"].best).toBe(4);
  });
});
