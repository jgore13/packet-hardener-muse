import { test } from "node:test";
import assert from "node:assert/strict";
import { harden } from "./muse.ts";
import { score } from "./rubric.ts";
import { hitRate } from "./hitrate.ts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

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

const PACKET_B = readFileSync(new URL("../packets/B-software-build.md", import.meta.url), "utf8");
const HARDENED = `${PACKET_B}\n## Red test\nerasure_severs_identity_map_and_preserves_events\n\n## Rollback\nRevert the migration.\n`;
const allFour = {
  ...good,
  failures: ["self_contradiction", "undefined_number", "unfalsifiable_criterion", "self_reported_control"].map((c) => ({ class: c, quote: "q", why: "w", fix: "f" })),
};

test("score comes from classes found, not the model", () => {
  assert.equal(score(HARDENED, good as any).score, 6);
  assert.equal(score(HARDENED, { ...good, failures: [...good.failures, ...good.failures] } as any).score, 6);
});

test("rubric_packet_b_all_four_classes_scores_0", () => {
  assert.equal(score(PACKET_B, allFour as any).score, 0);
});

test("rubric_reads_red_test_and_rollback_from_packet_not_answer", () => {
  assert.equal(score(HARDENED, allFour as any).score, 2);
});

test("hit rate needs class and anchor to match", () => {
  const h = hitRate(good as any, [
    { id: "B1", class: "self_contradiction", anchors: ["audit log stays intact"], note: "" },
    { id: "B2", class: "self_reported_control", anchors: ["risk score above 70"], note: "" },
  ]);
  assert.equal(h.found, 1);
});

// Frozen 2026-10-22 by Chair ruling. Changing a key must be a deliberate, visible act.
const FROZEN: Record<string, string> = {
  A: "a50c22cfd9c047347369cdc61d01ba34fff9f9b9a4109d4b52e2887930328140",
  B: "2376244ad4a0fb48ac2ef8110e6cfa14a7df1117a262f2b82a3b16273f4ac812",
  C: "c2fb6a3d6441af1457c51b8a51be0709293b88c35d4cc114f069d87482640035",
};

test("answer_keys_frozen", () => {
  let planted = 0;
  for (const [id, hash] of Object.entries(FROZEN)) {
    const text = readFileSync(new URL(`../answer-keys/${id}.json`, import.meta.url), "utf8").replace(/\r/g, "");
    assert.equal(createHash("sha256").update(text).digest("hex"), hash, `answer-keys/${id}.json changed`);
    planted += JSON.parse(text).planted.length;
  }
  assert.equal(planted, 12);
});
