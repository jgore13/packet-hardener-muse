export type Decision = "ACCEPTED" | "OVERRIDDEN";
export function validateRuling(decision: unknown, ruling: unknown): { decision: Decision; ruling: string } {
  if (decision !== "ACCEPTED" && decision !== "OVERRIDDEN") throw new Error("Choose ACCEPTED or OVERRIDDEN.");
  if (typeof ruling !== "string" || !ruling.trim() || ruling.trim().length > 200 || /[\r\n]/.test(ruling))
    throw new Error("Write a one-line ruling of 1–200 characters.");
  return { decision, ruling: ruling.trim() };
}
export function cliDecision(choice: string): Decision {
  const c = choice.trim().toLowerCase();
  if (c === "a" || c === "accept") return "ACCEPTED";
  if (c === "o" || c === "override") return "OVERRIDDEN";
  throw new Error("Choose a/accept or o/override. No ruling saved.");
}
