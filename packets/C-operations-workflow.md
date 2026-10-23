# Task Packet — Returns intake for a refrigerated-goods warehouse (synthetic)

## Context
A warehouse receives about 300 customer returns a week, some of them
refrigerated. Returns are logged on paper today.

## Requirements
1. Returned items are restocked within 4 hours of arrival.
2. Every return waits for the Friday QA batch inspection before it is restocked.
3. Alert the ops manager when the shrink rate passes 3%.
4. At the end of each shift, the shift lead ticks "cold chain verified" on the shift sheet.

## Done when
- The returns process is in place.
