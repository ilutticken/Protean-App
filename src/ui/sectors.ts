import type { Sector } from "../lib/types";

/** Fixed sector metadata — hues machine-validated (docs/research/05 §7.1); never re-ordered. */
export const SECTORS: Record<Sector, { label: string; short: string; hex: string }> = {
  pushup: { label: "Push-Up Family", short: "Push-Up", hex: "#e1514e" },
  dips_planche_hs: { label: "Dips · Planche · Handstand", short: "Planche/HS", hex: "#8d5406" },
  core: { label: "Core", short: "Core", hex: "#ab9017" },
  squat: { label: "Squat Family", short: "Squat", hex: "#3f7b04" },
  posterior: { label: "Posterior Legs", short: "Posterior", hex: "#00aa95" },
  pull_levers: { label: "Pull-Ups · Levers", short: "Pull/Levers", hex: "#006da8" },
  back_chain: { label: "Back Chain", short: "Back", hex: "#848dde" },
  balance: { label: "Balance · Acrobatics", short: "Acro", hex: "#7f4bb1" },
  run_martial: { label: "Locomotion · Martial", short: "Loco", hex: "#d1649c" },
};

export const SECTOR_ORDER: Sector[] = [
  "pushup",
  "dips_planche_hs",
  "core",
  "squat",
  "posterior",
  "pull_levers",
  "back_chain",
  "balance",
  "run_martial",
];
