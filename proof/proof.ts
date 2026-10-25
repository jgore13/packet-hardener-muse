// Standalone observer. No imports from the app; no network or session mutation.
import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const PROOF_COPY = "Knowing is proving every thought. This receipt is the proof.";
export const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
export function canonical(value: any): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  throw new Error("PROOF_INVALID: export must contain JSON values only.");
}
export type Session = { packet: string; findings: Record<string, unknown>; decision: "ACCEPTED" | "OVERRIDDEN"; ruling: string };
export type Receipt = { payload: { version: 1; algorithm: "RSA-SHA256"; copy: string; sequence: number; previous_receipt_sha256: string | null;
  timestamp: string; input_sha256: string; structure_sha256: string; session_export_sha256: string; ruling: { decision: string; text: string }; public_key_sha256: string };
  signature: string; receipt_sha256: string };
export function sessionFrom(bytes: Buffer): Session {
  let s: any;
  try { s = JSON.parse(bytes.toString("utf8")); } catch { throw new Error("PROOF_INVALID: session export is not JSON."); }
  if (!s || typeof s.packet !== "string" || !s.findings || typeof s.findings !== "object" || Array.isArray(s.findings)
    || !["ACCEPTED", "OVERRIDDEN"].includes(s.decision) || typeof s.ruling !== "string" || !s.ruling.trim())
    throw new Error("PROOF_INVALID: export needs packet, findings, decision and ruling.");
  return s;
}
function fingerprint(publicKey: string | Buffer) { return sha256(createPublicKey(publicKey).export({ type: "spki", format: "der" })); }
export function generateKeys(privatePath: string, publicPath: string, openssl: string) {
  if (existsSync(privatePath) || existsSync(publicPath)) throw new Error("PROOF_REFUSED: key destination already exists.");
  mkdirSync(dirname(privatePath), { recursive: true, mode: 0o700 }); mkdirSync(dirname(publicPath), { recursive: true });
  execFileSync(openssl, ["genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048", "-out", privatePath], { stdio: ["ignore", "ignore", "pipe"], timeout: 30_000 });
  const publicKey = execFileSync(openssl, ["pkey", "-in", privatePath, "-pubout"], { timeout: 5000 });
  writeFileSync(publicPath, publicKey, { flag: "wx" });
}
export function verifySignature(receipt: Receipt, publicKey: string | Buffer): void {
  const p = receipt?.payload;
  const hash = (s: unknown) => typeof s === "string" && /^[a-f0-9]{64}$/.test(s);
  if (!p || p.version !== 1 || p.algorithm !== "RSA-SHA256" || p.copy !== PROOF_COPY || !Number.isSafeInteger(p.sequence) || p.sequence < 1
    || (p.sequence === 1 ? p.previous_receipt_sha256 !== null : !hash(p.previous_receipt_sha256))
    || !hash(p.input_sha256) || !hash(p.structure_sha256) || !hash(p.session_export_sha256)
    || !p.ruling || !["ACCEPTED", "OVERRIDDEN"].includes(p.ruling.decision) || typeof p.ruling.text !== "string" || !p.ruling.text.trim()
    || typeof p.timestamp !== "string" || !Number.isFinite(Date.parse(p.timestamp))) throw new Error("PROOF_FAILED: invalid receipt fields.");
  if (p.public_key_sha256 !== fingerprint(publicKey)) throw new Error("PROOF_FAILED: public key fingerprint mismatch.");
  if (typeof receipt.signature !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(receipt.signature)
    || !cryptoVerify("sha256", Buffer.from(canonical(p)), publicKey, Buffer.from(receipt.signature, "base64")))
    throw new Error("PROOF_FAILED: signature mismatch.");
  if (receipt.receipt_sha256 !== sha256(canonical({ payload: p, signature: receipt.signature }))) throw new Error("PROOF_FAILED: receipt hash mismatch.");
}
export function issueReceipt(bytes: Buffer, privatePath: string, publicKey: string | Buffer, openssl: string, previous: Receipt | null = null, timestamp = new Date().toISOString()): Receipt {
  const s = sessionFrom(bytes);
  if (previous) verifySignature(previous, publicKey);
  const payload: Receipt["payload"] = { version: 1, algorithm: "RSA-SHA256", copy: PROOF_COPY, sequence: previous ? previous.payload.sequence + 1 : 1,
    previous_receipt_sha256: previous?.receipt_sha256 ?? null, timestamp, input_sha256: sha256(s.packet), structure_sha256: sha256(canonical(s.findings)),
    session_export_sha256: sha256(bytes), ruling: { decision: s.decision, text: s.ruling }, public_key_sha256: fingerprint(publicKey) };
  const signature = execFileSync(openssl, ["dgst", "-sha256", "-sign", privatePath], { input: canonical(payload), timeout: 5000 }).toString("base64");
  const receipt: Receipt = { payload, signature, receipt_sha256: sha256(canonical({ payload, signature })) };
  verifySignature(receipt, publicKey); // Also refuses a private/public key mismatch before output.
  return receipt;
}
export function verifyReceipt(receipt: Receipt, bytes: Buffer, publicKey: string | Buffer): void {
  verifySignature(receipt, publicKey);
  if (sha256(bytes) !== receipt.payload.session_export_sha256) throw new Error("PROOF_FAILED: session export SHA-256 mismatch (bytes changed).");
  const s = sessionFrom(bytes);
  if (sha256(s.packet) !== receipt.payload.input_sha256 || sha256(canonical(s.findings)) !== receipt.payload.structure_sha256
    || s.decision !== receipt.payload.ruling.decision || s.ruling !== receipt.payload.ruling.text)
    throw new Error("PROOF_FAILED: session fields do not match receipt.");
}
export function verifyChain(receipts: Receipt[], publicKey: string | Buffer, expectedHead?: string): void {
  let previous: Receipt | null = null;
  for (const receipt of receipts) {
    verifySignature(receipt, publicKey);
    if (receipt.payload.sequence !== (previous ? previous.payload.sequence + 1 : 1) || receipt.payload.previous_receipt_sha256 !== (previous?.receipt_sha256 ?? null))
      throw new Error("PROOF_FAILED: chain missing, reordered or replaced receipt.");
    previous = receipt;
  }
  if (expectedHead && previous?.receipt_sha256 !== expectedHead) throw new Error("PROOF_FAILED: retained head mismatch (ledger changed or truncated).");
}
export function readLedger(path: string): Receipt[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
