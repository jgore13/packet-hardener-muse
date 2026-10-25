import { existsSync, openSync, closeSync, unlinkSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKeys, issueReceipt, readLedger, verifyChain, verifyReceipt, PROOF_COPY } from "./proof.ts";

function openssl() {
  // All commands are local. An explicit override supports other installed distributions.
  if (process.env.PROOF_OPENSSL) return process.env.PROOF_OPENSSL;
  const git = "C:/Program Files/Git/usr/bin/openssl.exe";
  return process.platform === "win32" && existsSync(git) ? git : "openssl";
}
export function main(args: string[]) {
  const [command, ...values] = args;
  if (command === "keygen" && values.length === 2) {
    generateKeys(resolve(values[0]), resolve(values[1]), openssl());
    console.log("Local signing keys created. Keep the private key on this machine; share only the public key."); return;
  }
  if (command === "issue" && values.length === 5) {
    const [session, privateKey, publicKey, ledger, output] = values.map(v => resolve(v));
    if (new Set([session, privateKey, publicKey, ledger, output]).size !== 5) throw new Error("PROOF_REFUSED: input/key/ledger/output paths must be distinct.");
    if (existsSync(output)) throw new Error("PROOF_REFUSED: output already exists.");
    mkdirSync(dirname(ledger), { recursive: true }); mkdirSync(dirname(output), { recursive: true });
    // Exclusive local lock prevents competing issuers from silently forking this ledger.
    const lock = `${ledger}.lock`; const fd = openSync(lock, "wx");
    try {
      const pub = readFileSync(publicKey); const chain = readLedger(ledger); verifyChain(chain, pub);
      const receipt = issueReceipt(readFileSync(session), privateKey, pub, openssl(), chain.at(-1) ?? null);
      // Never rewrite a ledger or overwrite an existing receipt. A partial I/O failure is loud.
      appendFileSync(ledger, JSON.stringify(receipt) + "\n");
      writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
      console.log(PROOF_COPY); console.log(`Receipt SHA-256: ${receipt.receipt_sha256}`);
    } finally { closeSync(fd); unlinkSync(lock); }
    return;
  }
  if (command === "verify" && values.length === 3) {
    verifyReceipt(JSON.parse(readFileSync(values[0], "utf8")), readFileSync(values[1]), readFileSync(values[2]));
    console.log(`PROOF_VERIFIED\n${PROOF_COPY}`); return;
  }
  if (command === "verify-ledger" && (values.length === 2 || values.length === 3)) {
    const chain = readLedger(values[0]);
    if (!chain.length) throw new Error("PROOF_FAILED: ledger is empty or missing.");
    verifyChain(chain, readFileSync(values[1]), values[2]); console.log(`PROOF_VERIFIED: ${chain.length} chained receipts.`); return;
  }
  throw new Error("Usage: node proof/cli.ts keygen PRIVATE PUBLIC | issue EXPORT PRIVATE PUBLIC LEDGER RECEIPT | verify RECEIPT EXPORT PUBLIC | verify-ledger LEDGER PUBLIC [RETAINED_HEAD_SHA256]");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (e) { console.error((e as Error).message); process.exitCode = 1; }
}
