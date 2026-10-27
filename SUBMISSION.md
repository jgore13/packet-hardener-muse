# Submission pack: Packet Hardener on Muse

Meta hackathon. Track: Startup. Theme: Build for Your World.
Due Nov 4, 2026, 9 PM ET. Planned submit: Nov 3 evening PT.

## One line
A build agent fills every gap with a guess. Packet Hardener finds where a guess can get in,
before anyone builds.

## What it does
1. **Packet in.** A Task Packet: the written brief a build agent works from.
2. **Muse finds.** One call returns schema-checked JSON only: failures (four named classes),
   a red test, a rollback, blockers. One retry if the JSON is off-schema. The raw reply is shown.
3. **Code scores.** `src/rubric.ts`: start 10, minus 2 per failure class found, minus 1 if the
   packet has no `## Red test`, minus 1 if it has no `## Rollback`, floor 0. The model never scores.
4. **Shout the successes.** Next to the score, a display-only view names what the packet does
   well: self-beautification, perfect number, perfect acceptance criterion, ideal control. A class
   is held when no failure of its pair was found. It never changes the score.
5. **The Chair rules.** Status is NOT_READY until a person clicks Accept or Override with a
   one-line ruling, saved as a receipt. Muse never approves its own work.

## Why it matters (Build for Your World)
Small teams hand briefs to AI builders every day. A self-contradiction, a number with no
formula, a "done when it works", or a status someone sets by hand turns into a wrong build.
This catches those four before the build starts, and leaves the decision with a person.

## Proof
- Three synthetic packets (cleaning bookings, account erasure, cold-goods returns), 12 planted
  failures, answer keys frozen 2026-10-22 and never sent to the model.
- Packet B in code: score 0 / 10, hit rate 4 of 4, on the canned stub reply.
- Test suite: `npm test`, offline, no key needed.
- Fresh synthetic packets (not the frozen keys) check the rubric, schema and "model never scores".

## Live status: blocked on 402
The live call to `https://api.meta.ai/v1`, model `muse-spark-1.3`, returned
**402 Payment Required**: key accepted, no usable credits. No retry loop, no workaround.
- Live score: none. No live run has landed.
- Live hit rate: none.
- Every number above comes from the canned stub reply, which the screen labels in red as
  "Not a live Muse result."
If credits arrive before submit, one live run on packet B replaces this section, and its
numbers are quoted exactly as the screen shows them.

## Run it
```
npm test          # offline
npm run app       # http://localhost:3000, stub, no key
npm run app:live  # only once credits work
```
Node 24+, no dependencies.

## What it is not
- No live Muse quality is proven yet.
- Local, single-user demo; not a hosted service.
- Clean room: synthetic packets only. No production code, customer data, or live keys.
