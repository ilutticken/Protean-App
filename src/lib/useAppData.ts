import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppData, Athlete, AthleteState } from "./types";
import { load, save } from "./storage";

export interface AppStore {
  data: AppData;
  /** Functional update; persisted to localStorage on every change. */
  update: (fn: (d: AppData) => AppData) => void;
  athlete: Athlete;
  athleteState: AthleteState;
  setActiveAthlete: (id: string) => void;
}

export function useAppDataRoot(seed: () => AppData): AppStore {
  const [data, setData] = useState<AppData>(() => load(seed));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    save(data);
  }, [data]);

  return useMemo<AppStore>(() => {
    // Before onboarding there are no athletes; consumers only read `athlete`
    // after App gates on athletes.length > 0.
    const athlete = (data.athletes.find((a) => a.id === data.activeAthleteId) ??
      data.athletes[0]) as Athlete | undefined;
    const athleteState: AthleteState = athlete
      ? (data.perAthlete[athlete.id] ?? emptyAthleteState())
      : emptyAthleteState();
    return {
      data,
      update: (fn) => setData((d) => fn(d)),
      athlete: athlete as Athlete,
      athleteState,
      setActiveAthlete: (id) => setData((d) => ({ ...d, activeAthleteId: id })),
    };
  }, [data]);
}

export function emptyAthleteState(): AthleteState {
  return { skillProgress: {}, slotState: {}, slotAlternatives: {} };
}

export const AppContext = createContext<AppStore | null>(null);

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}

/** Update helper scoped to the active athlete's state blob. */
export function updateAthleteState(
  store: AppStore,
  fn: (s: AthleteState) => AthleteState,
): void {
  const id = store.athlete.id;
  store.update((d) => ({
    ...d,
    perAthlete: {
      ...d.perAthlete,
      [id]: fn(d.perAthlete[id] ?? emptyAthleteState()),
    },
  }));
}
