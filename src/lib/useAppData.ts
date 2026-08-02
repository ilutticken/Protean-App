import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppData, Athlete, AthleteState } from "./types";
import { emptyAthleteState, load, save } from "./storage";

export { emptyAthleteState };

export interface AppStore {
  data: AppData;
  /** Functional update; persisted to localStorage on every change. */
  update: (fn: (d: AppData) => AppData) => void;
  athlete: Athlete;
  athleteState: AthleteState;
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

  return useMemo<AppStore>(
    () => ({
      data,
      update: (fn) => setData((d) => fn(d)),
      // Null only before onboarding; App gates on data.athlete before rendering
      // anything that reads this.
      athlete: data.athlete as Athlete,
      athleteState: data.state,
    }),
    [data],
  );
}

export const AppContext = createContext<AppStore | null>(null);

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}

/** Update helper scoped to the athlete's derived-state blob. */
export function updateAthleteState(
  store: AppStore,
  fn: (s: AthleteState) => AthleteState,
): void {
  store.update((d) => ({ ...d, state: fn(d.state) }));
}

/** Update helper for the athlete's profile (bodyweight, height, units). */
export function updateAthlete(store: AppStore, fn: (a: Athlete) => Athlete): void {
  store.update((d) => (d.athlete ? { ...d, athlete: fn(d.athlete) } : d));
}
