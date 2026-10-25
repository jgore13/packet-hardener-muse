# Packet Hardener on Muse

A build agent fills every gap with a guess. The hardener finds the places a guess can enter.

- **The model finds.** One call to Muse returns schema-checked JSON: `failures[]`, `red_test`, `rollback`, `blockers[]`. One retry on malformed JSON. The raw response is always shown.
- **Code judges.** `src/rubric.ts` computes the score: start at 10, minus 2 per failure class found, minus 1 if the packet has no `## Red test` section, minus 1 if it has no `## Rollback` section, floor 0. Both are read from the packet, never from the model. The model never states a score.
- **The Chair rules.** Status stays `NOT_READY` until a human accepts or overrides with a one-line ruling. The ruling is saved as a receipt.

The four failure classes: self-contradiction, undefined number, unfalsifiable acceptance criterion, self-reported control.

## Proof
Three synthetic packets (service business, software build, operations workflow) carry 12 planted failures, 4 each. The answer keys in `answer-keys/` never go to the model. Each run reports a hit rate.

## Run
```
npm run app       # the one screen at http://localhost:3000, stub reply, no key needed
npm run stub      # same loop in the terminal
cp .env.example .env.local   # then fill MODEL_API_KEY and MUSE_MODEL
npm run live      # one live call to Muse on packet B (terminal)
npm run app:live  # the screen, live
node src/run.ts packets/A-service-business.md
npm test
```
Node 24+, no dependencies.

## Local integration and receipts

The server starts in canned mode by default; live mode requires `npm run app:live`
(explicit `--live`). Stub mode does not load API keys. The configured default is
`https://api.meta.ai/v1`, model `muse-spark-1.3`, using Chat Completions, a 30-second
timeout per call and `max_completion_tokens: 2048`. At most one retry occurs for
malformed/off-schema findings; HTTP, connection and timeout errors are not retried.
Input is limited to 50,000 UTF-8 bytes. Usage is retained per attempt when returned;
absent usage stays unknown. These are request limits, not a currency cost guarantee.
See [Meta's API guide](https://dev.meta.ai/docs/protocols/chat-completions).

Findings include suggested fixes and blockers. Editing a packet invalidates its
analysis/ruling display. A ruling references the original server-held run and exact
packet; client-supplied findings cannot replace that run. Runs expire after fifteen
minutes or server restart. Repeating the same ruling returns the same receipt;
changing an already saved ruling is refused. CLI choices and one-line rulings are
validated before writing. This is a local single-user demonstration, not a hosted
authentication/authorization system.

## Proof Receipt

Knowing is proving every thought. This receipt is the proof.

The independent [Proof Receipt module](proof/README.md) signs a completed session
export locally with OpenSSL, chains receipts using SHA-256, and verifies with only
the export, receipt and retained public key. It leaves the existing session flow
and prompt unchanged. No key or session is sent to a network service. A changed
export byte produces `PROOF_FAILED` and a nonzero exit code. Keep a trusted public
key and tail hash to detect key substitution or ledger truncation.

All tests run offline (`npm test`), using canned/mock provider responses, loopback
HTTP and generated test signing keys. No live Muse quality or credit use is proven
by these tests. A live three-packet evaluation and hackathon submission remain
separate approvals. No schedules are installed.
