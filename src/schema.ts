export const FAILURE_CLASSES = [
  "self_contradiction",
  "undefined_number",
  "unfalsifiable_criterion",
  "self_reported_control",
] as const;

export type FailureClass = (typeof FAILURE_CLASSES)[number];

export type Failure = { class: FailureClass; quote: string; why: string; fix: string };

export type Findings = {
  failures: Failure[];
  red_test: string;
  rollback: string;
  blockers: string[];
};

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

// Returns a list of problems; empty means the object matches the schema.
export function validateFindings(v: unknown): string[] {
  const errs: string[] = [];
  if (typeof v !== "object" || v === null || Array.isArray(v)) return ["root is not an object"];
  const o = v as Record<string, unknown>;

  if (!Array.isArray(o.failures)) errs.push("failures must be an array");
  else
    o.failures.forEach((f, i) => {
      if (typeof f !== "object" || f === null) return errs.push(`failures[${i}] is not an object`);
      const r = f as Record<string, unknown>;
      if (!FAILURE_CLASSES.includes(r.class as FailureClass))
        errs.push(`failures[${i}].class must be one of ${FAILURE_CLASSES.join(", ")}`);
      for (const k of ["quote", "why", "fix"]) if (!isStr(r[k])) errs.push(`failures[${i}].${k} must be a non-empty string`);
    });

  if (!isStr(o.red_test) || !/^[a-z][a-z0-9_]*$/.test(o.red_test))
    errs.push("red_test must be a snake_case identifier");
  if (!isStr(o.rollback)) errs.push("rollback must be a non-empty string");
  if (!Array.isArray(o.blockers) || !o.blockers.every(isStr)) errs.push("blockers must be an array of strings");
  return errs;
}
