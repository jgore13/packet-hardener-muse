import { test } from "node:test";
import assert from "node:assert/strict";
import { harden } from "./muse.ts";
import { score } from "./rubric.ts";
import { hitRate } from "./hitrate.ts";

const good = {
  failures: [
    { class: "self_contradiction", quote: "audit log stays intact", why: "w", fix: "f" },
    { class: "undefined_number", quote: "risk score above 70", why: "w", fix: "f" },
  ],
  red_test: "erasure_preserves_events",
  rollback: "Revert the migration.",
  blockers: [],
};

test("retries once on malformed JSON, then passes", async () => {
  let n = 0;
  const r = await harden("p", async () => (n++ === 0 ? "not json" : JSON.stringify(good)));
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 2);
});

test("fails after one retry", async () => {
  const r = await harden("p", async () => "{}");
  assert.equal(r.ok, false);
  assert.equal(r.attempts, 2);
});

test("score comes from classes found, not the model", () => {
  assert.equal(score(good as any).score, 6);
  assert.equal(score({ ...good, failures: [...good.failures, ...good.failures] } as any).score, 6);
});

test("hit rate needs class and anchor to match", () => {
  const h = hitRate(good as any, [
    { id: "B1", class: "self_contradiction", anchors: ["audit log stays intact"], note: "" },
    { id: "B2", class: "self_reported_control", anchors: ["risk score above 70"], note: "" },
  ]);
  assert.equal(h.found, 1);
});
