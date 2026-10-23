# Task Packet — Account erasure for a notes app (synthetic)

## Context
A consumer notes app with about 40,000 users. Users sign in with email. Every
change to a note writes a row to `audit_events`.

## Requirements
1. Users can request erasure of their account and all personal data from Settings.
2. The audit log stays intact. No row in `audit_events` is ever deleted or modified.
3. Flag accounts with a risk score above 70 for manual review before erasure runs.
4. After each release, an admin sets `compliance_status = 'compliant'` on the release record.

## Done when
- Erasure works.
