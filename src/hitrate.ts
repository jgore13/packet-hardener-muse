// Compares findings to the planted answer key. The key never goes to the model.
import type { Findings } from "./schema.ts";

export type Planted = { id: string; class: string; anchors: string[]; note: string };

const norm = (s: string) => s.toLowerCase().replace(/[`"'*]/g, "").replace(/\s+/g, " ").trim();

export function hitRate(findings: Findings, planted: Planted[]) {
  const results = planted.map((p) => {
    const hit = findings.failures.some(
      (f) => f.class === p.class && p.anchors.some((a) => norm(f.quote).includes(norm(a))),
    );
    return { id: p.id, class: p.class, hit };
  });
  return { found: results.filter((r) => r.hit).length, total: planted.length, results };
}
