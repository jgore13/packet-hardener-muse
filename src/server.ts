// Usage: node src/server.ts [--stub]   then open http://localhost:3000
// The browser never sees the key: it talks only to these routes.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { harden } from "./muse.ts";
import { score } from "./rubric.ts";
import { hitRate, type Planted } from "./hitrate.ts";
import { STUB_REPLY } from "./stub.ts";
import { validateFindings } from "./schema.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(root, ".env.local"))) process.loadEnvFile(join(root, ".env.local"));

const stub = process.argv.includes("--stub");
const port = Number(process.env.PORT || 3000);

const PACKETS = [
  { id: "A", label: "Service business: cleaning bookings", file: "packets/A-service-business.md" },
  { id: "B", label: "Software build: account erasure", file: "packets/B-software-build.md" },
  { id: "C", label: "Operations: returns intake", file: "packets/C-operations-workflow.md" },
].map((p) => ({ ...p, text: readFileSync(join(root, p.file), "utf8") }));

// Matches by exact text, so an edited packet gets no hit rate rather than a wrong one.
// In stub mode only packet B gets one: the stub reply was written for B.
const norm = (s: string) => s.replace(/\r\n/g, "\n").trim();
function keyFor(packet: string): Planted[] | undefined {
  const p = PACKETS.find((x) => norm(x.text) === norm(packet));
  if (!p || (stub && p.id !== "B")) return undefined;
  return (JSON.parse(readFileSync(join(root, "answer-keys", `${p.id}.json`), "utf8")) as { planted: Planted[] }).planted;
}

async function body(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function send(res: ServerResponse, status: number, data: unknown, type = "application/json") {
  res.writeHead(status, { "Content-Type": type });
  res.end(type === "application/json" ? JSON.stringify(data) : (data as string));
}

createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") return send(res, 200, readFileSync(join(root, "app/index.html"), "utf8"), "text/html; charset=utf-8");

    if (req.method === "GET" && req.url === "/api/packets")
      return send(res, 200, { mode: stub ? "stub" : "live", packets: PACKETS.map(({ id, label, text }) => ({ id, label, text })) });

    if (req.method === "POST" && req.url === "/api/harden") {
      const { packet } = await body(req);
      if (typeof packet !== "string" || !packet.trim()) return send(res, 400, { error: "Paste a packet first." });
      const result = await harden(packet, stub ? async () => STUB_REPLY : undefined);
      if (!result.ok) return send(res, 200, { ...result, status: "NOT_READY" });
      const key = keyFor(packet);
      return send(res, 200, {
        ...result,
        score: score(packet, result.findings),
        hits: key ? hitRate(result.findings, key) : null,
        status: "NOT_READY",
        mode: stub ? "stub" : "live",
      });
    }

    if (req.method === "POST" && req.url === "/api/rule") {
      const r = await body(req);
      if (!["ACCEPTED", "OVERRIDDEN"].includes(r.decision)) return send(res, 400, { error: "Decision must be ACCEPTED or OVERRIDDEN." });
      if (typeof r.ruling !== "string" || !r.ruling.trim()) return send(res, 400, { error: "Write a one-line ruling." });
      if (validateFindings(r.run?.findings).length) return send(res, 400, { error: "Run the packet before ruling." });
      // Recompute here; never trust a score or hit rate sent back from the page.
      const packet = String(r.packet ?? "");
      const s = score(packet, r.run.findings);
      const key = keyFor(packet);
      const hits = key ? hitRate(r.run.findings, key) : null;
      const receipt = {
        at: new Date().toISOString(),
        mode: stub ? "stub" : "live",
        model: stub ? null : process.env.MUSE_MODEL ?? null,
        decision: r.decision,
        ruling: r.ruling.trim(),
        score: s.score,
        hit_rate: hits ? `${hits.found}/${hits.total}` : null,
        packet,
        findings: r.run.findings,
        raw: r.run.raw ?? null,
      };
      mkdirSync(join(root, "receipts"), { recursive: true });
      const name = `${receipt.at.replace(/[:.]/g, "-")}.json`;
      writeFileSync(join(root, "receipts", name), JSON.stringify(receipt, null, 2));
      return send(res, 200, { receipt, file: `receipts/${name}` });
    }

    send(res, 404, { error: "Not found" });
  } catch (e) {
    send(res, 500, { error: (e as Error).message });
  }
// Loopback only: on all interfaces, anyone on this Wi-Fi could reach the port and spend the credits.
}).listen(port, "127.0.0.1", () => console.log(`Packet Hardener on http://127.0.0.1:${port}${stub ? "  [STUB: no live call]" : ""}`));
