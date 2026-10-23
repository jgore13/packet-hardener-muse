// A canned reply in the exact wire format, written for packet B, so the loop
// runs before the key exists. It is not a Muse response.
export const STUB_REPLY = JSON.stringify({
  failures: [
    { class: "self_contradiction", quote: "The audit log stays intact. No row in `audit_events` is ever deleted or modified.", why: "Erasure must remove personal data that audit rows hold.", fix: "Store a pseudonymous ref in events; erasure severs the identity map." },
    { class: "undefined_number", quote: "risk score above 70", why: "No formula, range, or zero.", fix: "Write the formula and its inputs." },
    { class: "unfalsifiable_criterion", quote: "Erasure works.", why: "Cannot fail.", fix: "Name a red test." },
    { class: "self_reported_control", quote: "an admin sets `compliance_status = 'compliant'`", why: "Hand-set status with no check.", fix: "Derive status from a runnable query." },
  ],
  red_test: "erasure_severs_identity_map_and_preserves_events",
  rollback: "Revert the migration and restore the identity map from the pre-release snapshot.",
  blockers: ["Resolve erasure vs audit log", "Define the risk score formula"],
});
