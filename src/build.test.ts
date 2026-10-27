// Entry checks: the numbers we say out loud are the numbers the code computes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { harden } from "./muse.ts";
import { score } from "./rubric.ts";
import { hitRate } from "./hitrate.ts";
import { STUB_REPLY } from "./stub.ts";
import { FAILURE_CLASSES } from "./schema.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const PACKET_B = read("../packets/B-software-build.md");

async function codeNumbers() {
  const r = await harden(PACKET_B, async () => STUB_REPLY);
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error("stub reply failed the schema");
  const h = hitRate(r.findings, JSON.parse(read("../answer-keys/B.json")).planted);
  // Same rule as the page's success view: a class is held when no failure of it was found.
  const held = FAILURE_CLASSES.filter((c) => !r.findings.failures.some((f) => f.class === c)).length;
  return { score: `${score(PACKET_B, r.findings).score} / 10`, hits: `${h.found} of ${h.total}`, held: `${held} of 4 held` };
}

test("packet B through the whole stub loop scores 0 in code, hit rate 4 of 4", async () => {
  assert.deepEqual(await codeNumbers(), { score: "0 / 10", hits: "4 of 4", held: "0 of 4 held" });
});

test("walkthrough quotes only the numbers the code computes", async () => {
  const w = read("../WALKTHROUGH.md"); const n = await codeNumbers();
  const quoted = [...w.matchAll(/\(Stub shows: ([^)]+?)\.\)/g)].map((m) => m[1]);
  assert.deepEqual(quoted, [n.score, n.held, n.hits]);
  const live = w.slice(w.indexOf("## Version 2"), w.indexOf("## Packet D"));
  assert.match(live, /PENDING CREDITS/);
  for (const slot of ["LIVE SCORE D", "LIVE HELD D", "LIVE SCORE", "LIVE HELD B", "LIVE HIT RATE"])
    assert.ok(live.includes(`[${slot}: not yet recorded]`), slot);
  assert.ok(live.lastIndexOf("packet B") > live.lastIndexOf("packet D"), "walkthrough ends on packet B");
});

test("walkthrough packet D: both sections present, one planted class found scores 8 and holds 3 of 4", () => {
  const D = read("../WALKTHROUGH.md").match(/## Packet D[\s\S]*?```markdown\n([\s\S]*?)```/)![1];
  const one = { failures: [{ class: "undefined_number", quote: "popularity score above 60", why: "w", fix: "f" }], red_test: "t", rollback: "r", blockers: [] } as any;
  assert.equal(score(D, { ...one, failures: [] }).score, 10);
  assert.equal(score(D, one).score, 8);
  assert.equal(FAILURE_CLASSES.filter((c) => !one.failures.some((f: any) => f.class === c)).length, 3);
  assert.ok(D.includes("popularity score above 60"));
});

test("submission pack claims no live number while the live call is blocked", async () => {
  const s = read("../SUBMISSION.md"); const n = await codeNumbers();
  assert.match(s, /402 Payment Required/);
  assert.match(s, /Live score: none\./); assert.match(s, /Live hit rate: none\./);
  assert.ok(s.includes(`score ${n.score}, hit rate ${n.hits}, on the canned stub reply`));
});
