// Entry checks: the numbers we say out loud are the numbers the code computes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { harden } from "./muse.ts";
import { score } from "./rubric.ts";
import { hitRate } from "./hitrate.ts";
import { STUB_REPLY } from "./stub.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const PACKET_B = read("../packets/B-software-build.md");

async function codeNumbers() {
  const r = await harden(PACKET_B, async () => STUB_REPLY);
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error("stub reply failed the schema");
  const h = hitRate(r.findings, JSON.parse(read("../answer-keys/B.json")).planted);
  return { score: `${score(PACKET_B, r.findings).score} / 10`, hits: `${h.found} of ${h.total}` };
}

test("packet B through the whole stub loop scores 0 in code, hit rate 4 of 4", async () => {
  assert.deepEqual(await codeNumbers(), { score: "0 / 10", hits: "4 of 4" });
});

test("walkthrough quotes only the numbers the code computes", async () => {
  const w = read("../WALKTHROUGH.md"); const n = await codeNumbers();
  const quoted = [...w.matchAll(/\(Stub shows: ([^)]+?)\.\)/g)].map((m) => m[1]);
  assert.deepEqual(quoted, [n.score, n.hits]);
  const live = w.slice(w.indexOf("## Version 2"));
  assert.match(live, /PENDING CREDITS/);
  assert.match(live, /\[LIVE SCORE: not yet recorded\]/); assert.match(live, /\[LIVE HIT RATE: not yet recorded\]/);
});

test("submission pack claims no live number while the live call is blocked", async () => {
  const s = read("../SUBMISSION.md"); const n = await codeNumbers();
  assert.match(s, /402 Payment Required/);
  assert.match(s, /Live score: none\./); assert.match(s, /Live hit rate: none\./);
  assert.ok(s.includes(`score ${n.score}, hit rate ${n.hits}, on the canned stub reply`));
});
