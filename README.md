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
