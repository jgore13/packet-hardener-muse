import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generateKeys, issueReceipt, verifyReceipt, verifyChain, PROOF_COPY, type Receipt } from "./proof.ts";
const openssl = process.env.PROOF_OPENSSL || (process.platform === "win32" && existsSync("C:/Program Files/Git/usr/bin/openssl.exe") ? "C:/Program Files/Git/usr/bin/openssl.exe" : "openssl");
let dir: string, priv: string, pub: Buffer, receipt: Receipt;
const bytes = Buffer.from(JSON.stringify({ packet: "Synthetic packet", findings: { blockers: ["Define score"], failures: [] }, decision: "OVERRIDDEN", ruling: "Synthetic test, no build authority" }));
before(() => { dir = mkdtempSync(join(tmpdir(), "proof-receipt-test-")); priv = join(dir, "private.pem"); generateKeys(priv, join(dir, "public.pem"), openssl); pub = readFileSync(join(dir, "public.pem")); receipt = issueReceipt(bytes, priv, pub, openssl); });
test("OpenSSL-signed export verifies offline with exact copy and public key", () => { verifyReceipt(receipt, bytes, pub); assert.equal(receipt.payload.copy, PROOF_COPY); assert.equal(receipt.payload.sequence, 1); });
test("one changed export byte fails loudly and CLI exits nonzero", () => {
  const tampered = Buffer.from(bytes); tampered[tampered.indexOf("Synthetic")] ^= 1;
  assert.throws(() => verifyReceipt(receipt, tampered, pub), /PROOF_FAILED.*bytes changed/);
  writeFileSync(join(dir, "receipt.json"), JSON.stringify(receipt)); writeFileSync(join(dir, "tampered.json"), tampered);
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("./cli.ts", import.meta.url)), "verify", join(dir, "receipt.json"), join(dir, "tampered.json"), join(dir, "public.pem")], { encoding: "utf8" });
  assert.equal(r.status, 1); assert.match(r.stderr, /PROOF_FAILED.*SHA-256 mismatch/);
});
test("two signed receipts chain; alteration, removal, reorder and truncation fail", () => {
  const second = issueReceipt(bytes, priv, pub, openssl, receipt); verifyChain([receipt, second], pub, second.receipt_sha256);
  assert.throws(() => verifyChain([second], pub), /PROOF_FAILED/);
  assert.throws(() => verifyChain([second, receipt], pub), /PROOF_FAILED/);
  assert.throws(() => verifyChain([receipt], pub, second.receipt_sha256), /retained head mismatch/);
  const changed = structuredClone(second); changed.payload.ruling.text += "x";
  assert.throws(() => verifyReceipt(changed, bytes, pub), /signature mismatch/);
  const rehashed = structuredClone(receipt); rehashed.receipt_sha256 = "0".repeat(64);
  assert.throws(() => verifyReceipt(rehashed, bytes, pub), /receipt hash mismatch/);
});
test("key files cannot be overwritten and wrong public keys cannot verify", () => {
  assert.throws(() => generateKeys(priv, join(dir, "public.pem"), openssl), /already exists/);
  generateKeys(join(dir, "other-private.pem"), join(dir, "other-public.pem"), openssl);
  assert.throws(() => verifyReceipt(receipt, bytes, readFileSync(join(dir, "other-public.pem"))), /fingerprint mismatch/);
});
