# Proof Receipt

Knowing is proving every thought. This receipt is the proof.

Standalone local observer for a completed Packet Hardener session export. It does not import or modify the app, session flow, prompt, rubric or existing receipt behavior. Run it after downloading a ruled session. It supports other Grid exports only if they supply the same `packet`, `findings`, `decision`, and `ruling` fields; no Founder HQ integration is claimed.

Requires Node 24+ and a locally installed OpenSSL. The CLI uses OpenSSL from PATH, or Git for Windows's installed binary, or `PROOF_OPENSSL` explicitly. No dependency installation, network call, account or verification service.

From the repo root:

```powershell
# Create local signing keys once. Existing files are never overwritten.
node proof/cli.ts keygen .proof-keys/private.pem proof-state/public.pem

# Observe the exact downloaded session export; append one signed receipt.
node proof/cli.ts issue session.json .proof-keys/private.pem proof-state/public.pem proof-state/ledger.jsonl proof-state/receipt-1.json

# Anyone with the export, receipt, and independently retained public key can verify.
node proof/cli.ts verify proof-state/receipt-1.json session.json proof-state/public.pem

# Verify ledger ordering/signatures, optionally pinning a previously kept tail hash.
node proof/cli.ts verify-ledger proof-state/ledger.jsonl proof-state/public.pem RETAINED_HEAD_SHA256
```

For the next session use the same ledger/key and a fresh receipt filename. Keep the receipt and original export together; JSON reformatting changes the export's byte hash. Keep the private key local in a private directory; it is not part of a verification bundle. The public key, export, receipt and ledger contain no private signing key. A lock file serializes local issuers; a crash leaves a visible lock that must be reconciled, never silently ignored. An I/O failure after ledger append may leave the signed receipt only in the ledger; preserve and verify that entry before recovery rather than issuing a replacement automatically.

Payload version 1 signs a deterministic JSON encoding (object keys sorted, array order retained, finite JSON values). SHA-256 covers the exact input string, canonical findings structure, and full export bytes. The signed payload includes the user's recorded decision/ruling, issuance timestamp, sequence, previous receipt hash and public-key fingerprint. OpenSSL creates RSA-2048/SHA-256 signatures. The receipt hash covers payload plus signature. The local Node crypto verifier uses the supplied public key; it never reads the private key or calls the network. `PROOF_FAILED` and exit code 1 indicate verification failure.

The chain detects changed, missing or reordered entries. Retain a trusted head hash to detect a removed suffix; the ledger alone cannot reveal that its end was truncated. Pin the public key independently: a newly substituted key is not the original issuer. This is integrity evidence, not a trusted time service, proof that model findings are correct, or certified human identity. A private-key holder can sign new statements; previously retained receipts/head hashes remain the comparison evidence. No automatic session hook, public anchor, external timestamp or ledger service is installed.
