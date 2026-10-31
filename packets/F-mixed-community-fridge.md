# Task Packet — Donation intake for a community fridge (synthetic)

## Context
A community fridge receives about 80 donations a week from shops and
households. Intake is logged in a shared spreadsheet today.

## Requirements
1. Prepared food is labelled with the time it was made and is removed
   48 hours after that time.
2. Donations are accepted around the clock, and the fridge is locked
   between 22:00 and 07:00.
3. Alert the coordinator when waste passes a fair level for the week.
4. A donor with a reliability score of 80 or more skips the intake check.
   Reliability score = on-time arrivals / total scheduled arrivals,
   times 100. Zero scheduled arrivals counts as 0.
5. The coordinator ticks "fridge checked today" on the intake sheet.

## Red test
prepared_food_removed_after_48_hours

## Done when
- [ ] prepared_food_removed_after_48_hours passes in CI.
- The fridge runs smoothly.
