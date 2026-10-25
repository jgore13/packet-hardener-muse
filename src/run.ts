// Usage: node src/run.ts <packet.md> [--stub] [--no-chair]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { cliDecision, validateRuling } from "./ruling.ts";
import { createInterface } from "node:readline/promises";
import { harden } from "./muse.ts";
import { score } from "./rubric.ts";
import { hitRate, type Planted } from "./hitrate.ts";
import { STUB_REPLY } from "./stub.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const packetPath = resolve(args.find((a) => !a.startsWith("--")) ?? join(root, "packets/B-software-build.md"));
const stub = args.includes("--stub");
const chair = !args.includes("--no-chair");
if (!stub && existsSync(join(root, ".env.local"))) process.loadEnvFile(join(root, ".env.local"));

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
for (const x of f.failures) line(`  ${x.class}: "${x.quote}"\n      ${x.why}\n      Fix: ${x.fix}`);
for (const blocker of f.blockers) line(`  Blocker: ${blocker}`);
line(`  red test: ${f.red_test}`);
line(`  rollback: ${f.rollback}`);

const s = score(packet, f);
line();
line(`── Score (computed by rubric.ts, not the model) ──`);
for (const l of s.lines) line(`  ${l.points}  ${l.reason}`);
line(`  = ${s.score} / 10`);

const keyId = basename(packetPath)[0];
const keyPath = join(root, "answer-keys", `${keyId}.json`);
let hits: ReturnType<typeof hitRate> | undefined;
// The stub reply was written for packet B; a hit rate on A or C would be meaningless.
if (existsSync(keyPath) && (!stub || keyId === "B")) {
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
let choice, ruling;
try {
  choice = (await rl.question("Chair: (a)ccept or (o)verride? ")).trim().toLowerCase();
  ruling = (await rl.question("One-line ruling: ")).trim();
} finally { rl.close(); }
let accepted;
try { accepted = validateRuling(cliDecision(choice), ruling); }
catch (e) { line((e as Error).message); process.exit(1); }

const receipt = {
  packet_file: basename(packetPath),
  packet,
  packet_sha256: createHash("sha256").update(packet).digest("hex"),
  at: new Date().toISOString(),
  mode: stub ? "stub" : "live",
  model: result.model,
  ...accepted,
  attempts: result.attempts,
  usage: result.usage,
  score: s.score,
  hit_rate: hits ? `${hits.found}/${hits.total}` : null,
  findings: f,
  raw: result.raw,
};
mkdirSync(join(root, "receipts"), { recursive: true });
const out = join(root, "receipts", `${receipt.at.replace(/[:.]/g, "-")}-${basename(packetPath, ".md")}.json`);
writeFileSync(out, JSON.stringify(receipt, null, 2), { flag: "wx" });
line(`Status: ${receipt.decision}. Receipt: ${out}`);
