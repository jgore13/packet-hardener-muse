// Fresh synthetic packets, not the frozen answer keys. These test the code path
// (schema, rubric, status); they cannot test what a live model would find.
import { test } from "node:test";
import assert from "node:assert/strict";
import { harden } from "./muse.ts";
import { score } from "./rubric.ts";

const D = `# Task Packet — Meeting-room booking for a public library (synthetic)

## Requirements
- A patron books a room for up to 2 hours.

## Red test
booking_over_two_hours_is_refused

## Rollback
Disable the booking form and restore the paper sign-up sheet.
`;

const E = `# Task Packet — Dock repair log for a bike-share fleet (synthetic)

## Requirements
- A mechanic marks a dock "repaired" when the work feels complete.
- Docks with a reliability index under 0.8 are inspected weekly.
`;

const F = `# Task Packet — Seed-swap sign-up for a garden club (synthetic)

## Requirements
- Members list seeds to swap. We will write a red test later and plan a rollback.

# Rollback
Delete the sign-up page.
`;

const G = `# Task Packet — Shift handover notes for a food bank (synthetic)

## RED TEST
handover_without_count_is_refused

### Rollback plan
Return to the printed handover sheet.
`;

const failure = (c: string) => ({ class: c, quote: "q", why: "w", fix: "f" });
const findings = (...classes: string[]) => ({ failures: classes.map(failure), red_test: "t", rollback: "r", blockers: [] }) as any;

test("fresh D: both sections, no failures scores 10", () => {
  assert.equal(score(D, findings()).score, 10);
});

test("fresh D: two classes, one repeated, scores 6", () => {
  assert.equal(score(D, findings("undefined_number", "self_reported_control", "undefined_number")).score, 6);
});

test("fresh E: no sections, no failures scores 8", () => {
  assert.equal(score(E, findings()).score, 8);
});

test("fresh E: all four classes, no sections scores 0", () => {
  assert.equal(score(E, findings("self_contradiction", "undefined_number", "unfalsifiable_criterion", "self_reported_control")).score, 0);
});

test("fresh F: red test named only in prose and a one-# Rollback both count as missing", () => {
  assert.equal(score(F, findings()).score, 8);
});

test("fresh G: heading case and deeper headings still count as present", () => {
  assert.equal(score(G, findings("self_reported_control")).score, 8);
});

test("fresh E: a reply that scores or approves itself is ignored by the rubric", async () => {
  const reply = JSON.stringify({ ...findings("self_reported_control"), score: 10, status: "READY", approved: true });
  const r = await harden(E, async () => reply);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(score(E, r.findings).score, 6);
});

test("fresh E: a reply with an unknown class fails the schema after one retry", async () => {
  const r = await harden(E, async () => JSON.stringify(findings("vibes_check")));
  assert.equal(r.ok, false);
  assert.equal(r.attempts, 2);
});
