# Walkthrough script: Nov 2 recording

About 90 seconds, one screen, one packet, one call, one score, one Accept.
Say only the numbers the screen shows; they come from code (`rubric.ts`, `hitrate.ts`).
Never say a number before it is on screen. No edited or mocked screens.

## Version 1: stub run (usable now, rehearsal only, NOT the submission)

Start: `npm run app`, open http://localhost:3000. The header reads "STUB mode".

1. "A build agent fills every gap with a guess. Packet Hardener finds where a guess can get in."
2. "This is packet B, a software task: account erasure. It is loaded already."
3. Click **Run**. "One call. In stub mode this is a canned reply, and the screen says so."
   Point at the red line: "Canned stub reply for packet B. Not a live Muse result."
4. Point at the score. "The score is computed by code, never by the model. Start at 10,
   minus 2 for each failure class, minus 1 each for no red test and no rollback section."
   Read the score off the screen. (Stub shows: 0 / 10.)
5. Point at the findings. Read one quote and its fix.
6. Point at the hit rate. "The answer key never goes to the model." Read it off the screen.
   (Stub shows: 4 of 4.)
7. Point at the status. "It is still NOT_READY. The model hunted the failures; it does not approve."
8. Type a one-line ruling, click **Accept**. "Only the Chair moves it. The ruling is saved as a receipt."

The stub numbers are rehearsal numbers. Do not use them in the submission video.

## Version 2: live run, PENDING CREDITS

Blocked: the first live call returned Muse API 402 (no usable credits). Record this version only
after the portal shows credits or an accepted card and James says "go".

Start: `npm run app:live`, open http://localhost:3000. The header reads "LIVE: Muse".

1. Same opening line as Version 1.
2. "Packet B, account erasure, loaded."
3. Click **Run**. "One live call to Muse." Point at the source line: "Live Muse call · [model as shown]".
4. Score: read it off the screen. [LIVE SCORE: not yet recorded]
5. Findings: read one quote and its fix, as returned.
6. Hit rate: read it off the screen. [LIVE HIT RATE: not yet recorded]
   If the screen says "Schema FAIL" or shows a retry, say so plainly. Do not re-run to get a better take.
7. "Still NOT_READY. The model does not approve its own work."
8. One-line ruling, **Accept**. Status changes; receipt saved.

Whatever the live numbers are, say those numbers. Do not tune the prompt, rubric or answer keys
to match the stub.
