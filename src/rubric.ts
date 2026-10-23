// The published rubric. Code computes the score; the model never states one.
import { FAILURE_CLASSES, type Findings } from "./schema.ts";

export const RUBRIC = {
  start: 10,
  perClassFound: 2,
  missingRedTest: 1,
  missingRollback: 1,
  floor: 0,
} as const;

export type ScoreLine = { reason: string; points: number };

// Red test and rollback are read from the PACKET, never from the model's answer:
// validateFindings already rejects any answer missing them, so a check there could never fire.
export function score(packet: string, findings: Findings): { score: number; lines: ScoreLine[] } {
  const found = FAILURE_CLASSES.filter((c) => findings.failures.some((f) => f.class === c));
  const lines: ScoreLine[] = found.map((c) => ({ reason: `failure class found: ${c}`, points: -RUBRIC.perClassFound }));
  if (!/^#{2,}\s*red test\b/im.test(packet)) lines.push({ reason: "packet has no ## Red test section", points: -RUBRIC.missingRedTest });
  if (!/^#{2,}\s*rollback\b/im.test(packet)) lines.push({ reason: "packet has no ## Rollback section", points: -RUBRIC.missingRollback });
  const total = lines.reduce((s, l) => s + l.points, RUBRIC.start);
  return { score: Math.max(RUBRIC.floor, total), lines };
}
