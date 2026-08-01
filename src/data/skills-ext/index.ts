import type { SectorExtension } from "../skill-helpers";
import { pushupExt } from "./pushup";
import { dipsPlancheHsExt } from "./dips_planche_hs";
import { pullLeversExt } from "./pull_levers";
import { backChainExt } from "./back_chain";
import { posteriorExt } from "./posterior";
import { squatExt } from "./squat";
import { coreExt } from "./core";
import { balanceExt } from "./balance";
import { runMartialExt } from "./run_martial";

/** Per-sector progression extensions, merged into the tree by src/data/skills.ts. */
export const sectorExtensions: SectorExtension[] = [
  pushupExt,
  dipsPlancheHsExt,
  pullLeversExt,
  backChainExt,
  posteriorExt,
  squatExt,
  coreExt,
  balanceExt,
  runMartialExt,
];
