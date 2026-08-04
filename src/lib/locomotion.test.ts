import { describe, expect, it } from "vitest";
import { locomotionBestFrom, cardioSummary, formatDuration, formatMeters } from "./locomotion";
import { locomotionExclusions, locomotionSources } from "../data/locomotion-sources";
import { skills } from "../data/skills";
import { skillStatuses } from "./selectors";
import { blankData, emptyAthleteState } from "./storage";
import type { Athlete, CardioEntry } from "./types";

const athlete: Athlete = {
  id: "a",
  name: "Zen",
  sex: "male",
  bodyweightKg: 78,
  unit: "kg",
  accent: "#00a4c0",
  bodyweightLog: [{ date: "2026-08-01", kg: 78 }],
};

const run = (meters: number, seconds?: number): CardioEntry => ({
  date: "2026-08-02",
  modality: "run",
  meters,
  ...(seconds !== undefined ? { seconds } : {}),
});
const swim = (meters: number): CardioEntry => ({ date: "2026-08-02", modality: "swim", meters });

describe("locomotion source registry", () => {
  it("covers every time/distance node except the documented exclusions", () => {
    const uncovered = Object.values(skills)
      .filter((n) => n.criterion.kind === "time" || n.criterion.kind === "distance")
      .map((n) => n.id)
      .filter((id) => !locomotionSources[id] && !locomotionExclusions[id]);
    expect(uncovered).toEqual([]);
  });

  it("references only real nodes, with a matching criterion kind", () => {
    for (const id of Object.keys(locomotionSources)) {
      expect(skills[id], `${id} is not a skill node`).toBeDefined();
      const timed = locomotionSources[id].overMeters !== undefined;
      expect(skills[id].criterion.kind, id).toBe(timed ? "time" : "distance");
    }
    for (const id of Object.keys(locomotionExclusions)) {
      expect(skills[id], `${id} is not a skill node`).toBeDefined();
    }
  });

  it("assigns each node the modality its id namespace implies", () => {
    for (const [id, src] of Object.entries(locomotionSources)) {
      const expected = /^swim(_base)?\./.test(id) ? "swim" : /^row(_base|_speed)?\./.test(id) ? "row" : "run";
      expect(src.modality, id).toBe(expected);
    }
  });

  it("marks exactly one node cumulative — the Million Metre Club", () => {
    const cumulative = Object.entries(locomotionSources)
      .filter(([, s]) => s.cumulative)
      .map(([id]) => id);
    expect(cumulative).toEqual(["row.million_meters"]);
  });

  it("times each run_speed tier over its own race distance", () => {
    const expected: Record<string, number> = { "5k": 5000, "10k": 10000, half: 21097, marathon: 42195 };
    for (const [id, src] of Object.entries(locomotionSources)) {
      if (!id.startsWith("run_speed.")) continue;
      const race = id.slice("run_speed.".length).replace(/_t\d$/, "");
      expect(src.overMeters, id).toBe(expected[race]);
    }
  });
});

describe("locomotionBestFrom", () => {
  it("is empty for an empty log", () => {
    expect(locomotionBestFrom(undefined)).toEqual({});
    expect(locomotionBestFrom([])).toEqual({});
  });

  it("reports the farthest single run for every run distance node", () => {
    const best = locomotionBestFrom([run(1000), run(5200), run(3000)]);
    expect(best["run_distance.5k"]).toBe(5200);
    expect(best["run_distance.marathon"]).toBe(5200);
  });

  it("never sums efforts — three 2 km runs are not a 5 km run", () => {
    const best = locomotionBestFrom([run(2000), run(2000), run(2000)]);
    expect(best["run_distance.5k"]).toBe(2000);
  });

  it("keeps run and swim distances separate", () => {
    const best = locomotionBestFrom([run(10000), swim(400)]);
    expect(best["swim.400m"]).toBe(400);
    expect(best["swim.1500m"]).toBe(400);
    expect(best["run_distance.10k"]).toBe(10000);
  });

  it("omits a modality entirely when nothing was logged for it", () => {
    const best = locomotionBestFrom([run(5000)]);
    expect(best["swim.400m"]).toBeUndefined();
  });

  it("takes the FASTEST qualifying effort for timed tiers", () => {
    const best = locomotionBestFrom([run(5000, 1500), run(5000, 1400), run(5000, 1600)]);
    expect(best["run_speed.5k_t2"]).toBe(1400);
  });

  it("admits a longer effort as evidence for a shorter tier, but not the reverse", () => {
    const best = locomotionBestFrom([run(10000, 2800)]);
    expect(best["run_speed.5k_t2"]).toBe(2800); // 10 km is strictly harder than 5 km
    expect(best["run_speed.marathon_t2"]).toBeUndefined(); // 10 km says nothing about a marathon
  });

  it("ignores efforts logged without a time when scoring timed tiers", () => {
    expect(locomotionBestFrom([run(5000)])["run_speed.5k_t2"]).toBeUndefined();
  });

  it("ignores non-finite or non-positive distances", () => {
    expect(locomotionBestFrom([run(NaN), run(0), run(-5)])).toEqual({});
  });

  it("keeps the distance but drops the clock when the time is zero or bogus", () => {
    const best = locomotionBestFrom([run(5000, 0), run(5000, NaN)]);
    expect(best["run_distance.5k"]).toBe(5000);
    expect(best["run_speed.5k_t2"]).toBeUndefined();
  });

  it("never credits the session-shape nodes", () => {
    const best = locomotionBestFrom([run(42195, 12000)]);
    for (const id of Object.keys(locomotionExclusions)) expect(best[id]).toBeUndefined();
  });
});

describe("skillStatuses with a cardio log — the end-to-end unlock", () => {
  const statusesFor = (cardioLog: CardioEntry[]) =>
    skillStatuses({ ...blankData(), athlete }, athlete, { ...emptyAthleteState(), cardioLog });

  it("leaves every locomotion node locked when nothing is logged", () => {
    const st = skillStatuses({ ...blankData(), athlete }, athlete, emptyAthleteState());
    expect(st["run_base.walk_30min"].status).toBe("available"); // no prereqs
    expect(st["run_distance.5k"].status).toBe("locked");
  });

  it("walks the run ladder up from a single logged 5 km", () => {
    const st = statusesFor([run(5000)]);
    expect(st["run_base.walk_30min"].status).toBe("achieved");
    expect(st["run_base.jog_1k"].status).toBe("achieved");
    expect(st["run_distance.mile"].status).toBe("achieved");
    expect(st["run_distance.5k"].status).toBe("achieved");
    // 5 km of a 10 km criterion reads as partial progress, not a fresh unlock.
    expect(st["run_distance.10k"].status).toBe("in-progress");
  });

  it("unlocks a percentile tier only when the time is good enough", () => {
    expect(statusesFor([run(5000, 2400)])["run_speed.5k_t2"].status).not.toBe("achieved");
    expect(statusesFor([run(5000, 1800)])["run_speed.5k_t2"].status).toBe("achieved");
  });

  it("applies the per-sex time threshold", () => {
    const female: Athlete = { ...athlete, sex: "female" };
    const log = [run(5000, 2100)]; // male T2 = 1888 s, female T2 = 2248 s
    const male = skillStatuses({ ...blankData(), athlete }, athlete, { ...emptyAthleteState(), cardioLog: log });
    const fem = skillStatuses({ ...blankData(), athlete: female }, female, {
      ...emptyAthleteState(),
      cardioLog: log,
    });
    expect(male["run_speed.5k_t2"].status).not.toBe("achieved");
    expect(fem["run_speed.5k_t2"].status).toBe("achieved");
  });

  it("still never auto-achieves the attested swim nodes", () => {
    const st = statusesFor([swim(4000)]);
    expect(st["swim.3800m"].status).toBe("achieved");
    expect(st["swim_base.water_safety"].status).not.toBe("achieved");
    expect(st["swim_base.open_water_400m"].status).not.toBe("achieved");
  });
});

describe("rowing", () => {
  const row = (meters: number, seconds?: number): CardioEntry => ({
    date: "2026-08-03",
    modality: "row",
    meters,
    ...(seconds !== undefined ? { seconds } : {}),
  });

  it("credits the erg ladder from the farthest single piece", () => {
    const best = locomotionBestFrom([row(5000)]);
    expect(best["row.2k"]).toBe(5000);
    expect(best["row.5k"]).toBe(5000);
    expect(best["row.marathon"]).toBe(5000); // best-so-far, criterion still unmet
  });

  it("keeps rowing separate from running and swimming", () => {
    const best = locomotionBestFrom([run(10000)]);
    expect(best["row.2k"]).toBeUndefined();
  });

  it("SUMS every piece for the Million Metre Club, and only for that node", () => {
    const log = [row(200000), row(300000), row(500000)];
    const best = locomotionBestFrom(log);
    expect(best["row.million_meters"]).toBe(1000000);
    // ...but the one-piece nodes still see only the farthest single row.
    expect(best["row.marathon"]).toBe(500000);
    expect(best["row.half"]).toBe(500000);
  });

  it("does not sum runs or swims", () => {
    const best = locomotionBestFrom([run(20000), run(30000)]);
    expect(best["run_distance.marathon"]).toBe(30000);
  });

  it("scores the 2K time tiers off a piece of at least 2 km", () => {
    expect(locomotionBestFrom([row(2000, 400)])["row_speed.2k_median"]).toBe(400);
    expect(locomotionBestFrom([row(1000, 180)])["row_speed.2k_median"]).toBeUndefined();
  });
});

describe("display helpers", () => {
  it("formats metres and kilometres", () => {
    expect(formatMeters(800)).toBe("800 m");
    expect(formatMeters(5000)).toBe("5 km");
    expect(formatMeters(21097)).toBe("21.10 km");
  });

  it("formats durations with and without hours", () => {
    expect(formatDuration(2531)).toBe("42:11");
    expect(formatDuration(4984)).toBe("1:23:04");
  });

  it("summarizes per modality", () => {
    const s = cardioSummary([run(5000), run(2000), swim(400)]);
    expect(s.run).toEqual({ count: 2, farthestM: 5000, totalM: 7000 });
    expect(s.swim).toEqual({ count: 1, farthestM: 400, totalM: 400 });
    expect(s.row).toEqual({ count: 0, farthestM: 0, totalM: 0 });
  });
});
