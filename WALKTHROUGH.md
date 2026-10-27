# Walkthrough script: Nov 2 recording

About 2 minutes, one screen. Say only the numbers the screen shows; they come from code
(`rubric.ts`, `hitrate.ts`, the page's success view). Never say a number before it is on screen.
No edited or mocked screens. The walkthrough always ends on packet B.

## Version 1: stub run (usable now, rehearsal only, NOT the submission)

Start: `npm run app`, open http://localhost:3000. The header reads "STUB mode".
Packet D (successes) needs a live call, so the stub version is packet B only.

1. "A build agent fills every gap with a guess. Packet Hardener finds where a guess can get in."
2. "This is packet B, a software task: account erasure. It is loaded already."
3. Click **Run**. "One call. In stub mode this is a canned reply, and the screen says so."
   Point at the red line: "Canned stub reply for packet B. Not a live Muse result."
4. Point at the score. "The score is computed by code, never by the model. Start at 10,
   minus 2 for each failure class, minus 1 each for no red test and no rollback section."
   Read the score off the screen. (Stub shows: 0 / 10.)
5. Point at the success view. "We score the failure and shout the successes. This view never
   changes the score." Read it off the screen. (Stub shows: 0 of 4 held.)
6. Point at the findings. Read one quote and its fix.
7. Point at the hit rate. "The answer key never goes to the model." Read it off the screen.
   (Stub shows: 4 of 4.)
8. Point at the status. "It is still NOT_READY. The model hunted the failures; it does not approve."
9. Type a one-line ruling, click **Accept**. "Only the Chair moves it. The ruling is saved as a receipt."

The stub numbers are rehearsal numbers. Do not use them in the submission video.

## Version 2: live run, PENDING CREDITS

Blocked: the first live call returned Muse API 402 (no usable credits). Record this version only
after the portal shows credits or an accepted card and James says "go".

Start: `npm run app:live`, open http://localhost:3000. The header reads "LIVE: Muse".

Part 1, successes, packet D:
1. Same opening line as Version 1.
2. Paste packet D (below). "A library room-booking task. It has a red test and a rollback."
3. Click **Run**. Point at the source line: "Live Muse call · [model as shown]".
4. Score: read it off the screen. [LIVE SCORE D: not yet recorded]
5. Success view: read it off the screen, then name each HELD class. [LIVE HELD D: not yet recorded]
   Packet D was written with one planted failure (an undefined number) and both sections. If
   Muse finds only that, code shows 8 / 10 and 3 of 4 held. Say what the screen shows, not this.

Part 2, ends on packet B:
6. Load packet B. "Now a packet with problems: account erasure." Click **Run**.
7. Score: read it off the screen. [LIVE SCORE: not yet recorded]
8. Success view: read it off the screen. [LIVE HELD B: not yet recorded]
9. Findings: read one quote and its fix, as returned.
10. Hit rate: read it off the screen. [LIVE HIT RATE: not yet recorded]
    If the screen says "Schema FAIL" or shows a retry, say so plainly. Do not re-run for a better take.
11. "Still NOT_READY. The model does not approve its own work."
12. One-line ruling, **Accept**. Status changes; receipt saved. End.

Whatever the live numbers are, say those numbers. Do not tune the prompt, rubric or answer keys
to match the stub or the design note above.

## Packet D (paste this)

```markdown
# Task Packet — Meeting-room booking for a public library (synthetic)

## Context
A small public library has three meeting rooms. Patrons book them at the front desk today.

## Requirements
- A patron with a library card books one room for 30 to 120 minutes, in 30-minute steps.
- Two bookings for the same room may not overlap; the second request is refused with the reason.
- Rooms with a popularity score above 60 need staff approval before the booking is confirmed.
- A booking is cancelled automatically if the patron has not checked in 15 minutes after its start.

## Done when
- A request longer than 120 minutes is refused.
- An overlapping request for the same room is refused and the reason is shown.
- A booking with no check-in 15 minutes after its start shows as cancelled.

## Red test
overlapping_booking_for_same_room_is_refused

## Rollback
Turn off online booking and return to the front-desk paper sheet; existing bookings stay valid.
```
