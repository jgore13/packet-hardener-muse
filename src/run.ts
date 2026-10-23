// Usage: node src/run.ts <packet.md> [--stub] [--no-chair]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { harden } from "./muse.ts";
import { score } from "./rubric.ts";
import { hitRate, type Planted } from "./hitrate.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
if (existsSync(join(root, ".env.local"))) process.loadEnvFile(join(root, ".env.local"));

const args = process.argv.slice(2);
const packetPath = resolve(args.find((a) => !a.startsWith("--")) ?? join(root, "packets/B-software-build.md"));
const stub = args.includes("--stub");
const chair = !args.includes("--no-chair");

// A canned reply in the exact wire format, so the loop runs before the key exists.
const STUB_REPLY = JSON.stringify({
  failures: [
    { class: "self_contradiction", quote: "The audit log stays intact. No row in `audit_events` is ever deleted or modified.", why: "Erasure must remove personal data that audit rows hold.", fix: "Store a pseudonymous ref in events; erasure severs the identity map." },
    { class: "undefined_number", quote: "risk score above 70", why: "No formula, range, or zero.", fix: "Write the formula and its inputs." },
    { class: "unfalsifiable_criterion", quote: "Erasure works.", why: "Cannot fail.", fix: "Name a red test." },
    { class: "self_reported_control", quote: "an admin sets `compliance_status = 'compliant'`", why: "Hand-set status with no check.", fix: "Derive status from a runnable query." },
  ],
  red_test: "erasure_severs_identity_map_and_preserves_events",
  rollback: "Revert the migration and restore the identity map from the pre-release snapshot.",
  blockers: ["Resolve erasure vs audit log", "Define the risk score formula"],
});

const packet = readFileSync(packetPath, "utf8");
const line = (s = "") => console.log(s);

line(`Packet Hardener on Muse${stub ? "  [STUB: no live call]" : ""}`);
line(`Packet: ${basename(packetPath)}`);
line();

const result = await harden(packet, stub ? async () => STUB_REPLY : undefined);

line("── Raw response ─────────────────────────────");
line(result.raw);
line();
line(`Schema: ${result.ok ? "PASS" : "FAIL"}   Calls: ${result.attempts}`);
if (!result.ok) {
  line(result.errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

const f = result.findings;
line();
line("── Findings ─────────────────────────────────");
for (const x of f.failures) line(`  ${x.class}: "${x.quote}"\n      ${x.why}`);
line(`  red test: ${f.red_test}`);
line(`  rollback: ${f.rollback}`);

const s = score(f);
line();
line(`── Score (computed by rubric.ts, not the model) ──`);
for (const l of s.lines) line(`  ${l.points}  ${l.reason}`);
line(`  = ${s.score} / 10`);

const keyPath = join(root, "answer-keys", `${basename(packetPath)[0]}.json`);
let hits: ReturnType<typeof hitRate> | undefined;
if (existsSync(keyPath)) {
  const key = JSON.parse(readFileSync(keyPath, "utf8")) as { planted: Planted[] };
  hits = hitRate(f, key.planted);
  line();
  line(`── Hit rate on planted flaws: ${hits.found} of ${hits.total} ──`);
  for (const r of hits.results) line(`  ${r.hit ? "found " : "MISSED"}  ${r.id}  ${r.class}`);
}

line();
line("Status: NOT_READY");
if (!chair) process.exit(0);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const choice = (await rl.question("Chair: (a)ccept or (o)verride? ")).trim().toLowerCase();
const ruling = (await rl.question("One-line ruling: ")).trim();
rl.close();

const receipt = {
  packet: basename(packetPath),
  at: new Date().toISOString(),
  mode: stub ? "stub" : "live",
  model: stub ? null : process.env.MUSE_MODEL,
  decision: choice.startsWith("a") ? "ACCEPTED" : "OVERRIDDEN",
  ruling,
  score: s.score,
  hit_rate: hits ? `${hits.found}/${hits.total}` : null,
  findings: f,
  raw: result.raw,
};
mkdirSync(join(root, "receipts"), { recursive: true });
const out = join(root, "receipts", `${receipt.at.replace(/[:.]/g, "-")}-${basename(packetPath, ".md")}.json`);
writeFileSync(out, JSON.stringify(receipt, null, 2));
line(`Status: ${receipt.decision}. Receipt: ${out}`);
