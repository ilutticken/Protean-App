import { it } from "vitest";
import { skills } from "./skills";
import { pushupExt } from "./skills-ext/pushup";
import { dipsPlancheHsExt } from "./skills-ext/dips_planche_hs";
import { pullLeversExt } from "./skills-ext/pull_levers";
import { backChainExt } from "./skills-ext/back_chain";
import { posteriorExt } from "./skills-ext/posterior";
import { squatExt } from "./skills-ext/squat";
import { coreExt } from "./skills-ext/core";
import { balanceExt } from "./skills-ext/balance";
import { runMartialExt } from "./skills-ext/run_martial";

const FILES = {
  pushup: pushupExt,
  dips_planche_hs: dipsPlancheHsExt,
  pull_levers: pullLeversExt,
  back_chain: backChainExt,
  posterior: posteriorExt,
  squat: squatExt,
  core: coreExt,
  balance: balanceExt,
  run_martial: runMartialExt,
} as const;

it("report", () => {
  const out: string[] = [];
  // sector mismatch
  for (const [file, ext] of Object.entries(FILES)) {
    for (const n of ext.nodes) {
      if (n.sector !== file) out.push(`SECTOR-MISMATCH ${n.id}: file=${file} field=${n.sector}`);
    }
  }
  // long names
  for (const id of Object.keys(skills)) {
    const nm = skills[id].name;
    if (nm.length > 26) out.push(`LONGNAME ${nm.length} ${id} :: ${nm}`);
  }
  // ring 0 presence + counts + buckets
  const bySector: Record<string, string[]> = {};
  for (const id of Object.keys(skills)) (bySector[skills[id].sector] ??= []).push(id);
  out.push("=== BALANCE REPORT ===");
  const buckets: { s: string; r: number; n: number }[] = [];
  for (const s of Object.keys(bySector).sort()) {
    const list = bySector[s];
    const b: Record<string, number> = {};
    for (const id of list) b[String(skills[id].ring)] = (b[String(skills[id].ring)] ?? 0) + 1;
    const rings = Object.keys(b).map(Number).sort((a, x) => a - x);
    for (const r of rings) buckets.push({ s, r, n: b[String(r)] });
    out.push(
      `${s}: total=${list.length} rings=${rings.length} max=${Math.max(...rings)} ring0=${b["0"] ?? 0} :: ` +
        rings.map((r) => `${r}:${b[String(r)]}`).join(" "),
    );
  }
  out.push("=== WORST BUCKETS ===");
  buckets.sort((a, b) => b.n - a.n);
  for (const x of buckets.slice(0, 12)) out.push(`  ${x.s} ring ${x.r} -> ${x.n} nodes`);
  // balance sector criteria
  for (const id of bySector["balance"] ?? []) {
    if (skills[id].criterion.kind !== "attested") out.push(`BAL-NOT-ATTESTED ${id} ${skills[id].criterion.kind}`);
  }
  // ring strictness
  for (const id of Object.keys(skills)) {
    for (const p of skills[id].prereqs) {
      if (!skills[p]) out.push(`DANGLING ${id} -> ${p}`);
      else if (!(skills[p].ring < skills[id].ring))
        out.push(`RING ${p}(${skills[p].sector} ${skills[p].ring}) -> ${id}(${skills[id].sector} ${skills[id].ring})`);
    }
  }
  // eslint-disable-next-line
  con