// The browser never sees the key. Default launch is local canned mode.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { harden, type MuseResult } from "./muse.ts";
import { score } from "./rubric.ts";
import { hitRate, type Planted } from "./hitrate.ts";
import { STUB_REPLY } from "./stub.ts";
import { validateRuling } from "./ruling.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKETS = [
  { id: "A", label: "Service business: cleaning bookings", file: "packets/A-service-business.md" },
  { id: "B", label: "Software build: account erasure", file: "packets/B-software-build.md" },
  { id: "C", label: "Operations: returns intake", file: "packets/C-operations-workflow.md" },
].map((p) => ({ ...p, text: readFileSync(join(root, p.file), "utf8") }));
const norm = (s: string) => s.replace(/\r\n/g, "\n").trim();
function keyFor(packet: string, stub: boolean): Planted[] | undefined {
  const p = PACKETS.find((x) => norm(x.text) === norm(packet));
  if (!p || (stub && p.id !== "B")) return undefined;
  return JSON.parse(readFileSync(join(root, "answer-keys", `${p.id}.json`), "utf8")).planted;
}
class RequestError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
async function body(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const c of req) { bytes += c.length; if (bytes > 256_000) throw new RequestError(413, "Request too large."); chunks.push(c); }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new RequestError(400, "Request must be a JSON object."); }
}
function send(res: ServerResponse, status: number, data: unknown, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(data) : data as string);
}

export function createApp(options: { stub?: boolean; receiptsDir?: string; analyze?: (packet: string) => Promise<MuseResult>; now?: () => number } = {}) {
  const stub = options.stub ?? true;
  const analyze = options.analyze ?? ((packet: string) => harden(packet, stub ? async () => STUB_REPLY : undefined));
  const now = options.now ?? Date.now;
  const runs = new Map<string, { packet: string; result: Extract<MuseResult, { ok: true }>; created: number; saved?: any }>();
  return createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/") return send(res, 200, readFileSync(join(root, "app/index.html"), "utf8"), "text/html; charset=utf-8");
      if (req.method === "GET" && req.url === "/api/packets") return send(res, 200, { mode: stub ? "stub" : "live", packets: PACKETS });
      if (req.method === "POST" && req.url === "/api/harden") {
        const { packet } = await body(req);
        if (typeof packet !== "string" || !packet.trim() || Buffer.byteLength(packet) > 50_000) throw new RequestError(400, "Packet must contain 1–50,000 UTF-8 bytes.");
        for (const [id, run] of runs) if (now() - run.created >= 15 * 60_000) runs.delete(id);
        // Refuse instead of evicting a run another tab may still need to rule on.
        if (runs.size >= 100) throw new RequestError(429, "Run limit reached. Wait for runs to expire or restart the local demo.");
        const result = await analyze(packet);
        if (!result.ok) return send(res, 200, { ...result, status: "NOT_READY", mode: stub ? "stub" : "live" });
        const run_id = randomUUID();
        runs.set(run_id, { packet, result: structuredClone(result), created: now() });
        const key = keyFor(packet, stub);
        return send(res, 200, { ...result, run_id, score: score(packet, result.findings), hits: key ? hitRate(result.findings, key) : null, status: "NOT_READY", mode: stub ? "stub" : "live" });
      }
      if (req.method === "POST" && req.url === "/api/rule") {
        const r = await body(req);
        let ruling;
        try { ruling = validateRuling(r.decision, r.ruling); } catch (e) { throw new RequestError(400, (e as Error).message); }
        const run = typeof r.run_id === "string" ? runs.get(r.run_id) : undefined;
        if (!run || now() - run.created >= 15 * 60_000) throw new RequestError(409, "Run missing or expired. Analyze the packet again before ruling.");
        if (r.packet !== run.packet) throw new RequestError(409, "Packet changed since analysis. Run it again before ruling.");
        if (run.saved) {
          if (run.saved.receipt.decision !== ruling.decision || run.saved.receipt.ruling !== ruling.ruling) throw new RequestError(409, "This run already has a different ruling.");
          return send(res, 200, run.saved);
        }
        const key = keyFor(run.packet, stub); const hits = key ? hitRate(run.result.findings, key) : null;
        const receipt = { at: new Date(now()).toISOString(), run_id: r.run_id, mode: stub ? "stub" : "live", model: run.result.model,
          ...ruling, score: score(run.packet, run.result.findings).score, hit_rate: hits ? `${hits.found}/${hits.total}` : null,
          packet: run.packet, packet_sha256: createHash("sha256").update(run.packet).digest("hex"), findings: run.result.findings,
          raw: run.result.raw, attempts: run.result.attempts, usage: run.result.usage };
        const dir = options.receiptsDir ?? join(root, "receipts");
        mkdirSync(dir, { recursive: true });
        const name = `${receipt.at.replace(/[:.]/g, "-")}-${r.run_id}.json`;
        writeFileSync(join(dir, name), JSON.stringify(receipt, null, 2), { flag: "wx" });
        run.saved = { receipt, file: `receipts/${name}` };
        return send(res, 200, run.saved);
      }
      send(res, 404, { error: "Not found" });
    } catch (e) { send(res, e instanceof RequestError ? e.status : 500, { error: (e as Error).message }); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Live mode requires an explicit switch; importing/tests/stub mode never load keys.
  const live = process.argv.includes("--live");
  if (live && existsSync(join(root, ".env.local"))) process.loadEnvFile(join(root, ".env.local"));
  createApp({ stub: !live }).listen(Number(process.env.PORT || 3000), "127.0.0.1", () => console.log(`Packet Hardener on http://127.0.0.1:${process.env.PORT || 3000}  [${live ? "LIVE: Muse" : "STUB: no live call"}]`));
}
