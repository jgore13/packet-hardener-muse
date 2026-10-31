# Task Packet — Study-room booking for a public library (synthetic)

## Context
A public library has 4 study rooms, each seating 6 people. Rooms are booked
at the front desk today. Zero bookings in a day counts as 0 for all rates below.

## Requirements
1. A patron books one room for 30, 60, 90, or 120 minutes. Bookings over
   120 minutes are refused.
2. A booking is a no-show when nobody checks in within 15 minutes of its
   start. No-show rate = no-shows / total bookings that day.
3. A patron with 3 no-shows in 30 days is paused for 14 days. The count comes
   from a query over check-in rows, not from a staff-set flag.
4. Cancelling at least 2 hours before the start frees the room at once.

## Red test
booking_over_120_minutes_is_refused
no_show_pause_after_3_in_30_days

## Rollback
Disable the booking page and return to the front-desk paper diary.

## Done when
- [ ] booking_over_120_minutes_is_refused passes in CI.
- [ ] no_show_pause_after_3_in_30_days passes in CI.
