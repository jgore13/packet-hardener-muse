// Server-only. Importing this module never sends a request.
import { SYSTEM_PROMPT } from "./prompt.ts";
import { validateFindings, type Findings } from "./schema.ts";
export type Msg = { role: "system" | "user" | "assistant"; content: string };
export type Usage = { prompt_tokens: number | null; completion_tokens: number | null; total_tokens: number | null };
type Reply = { raw: string; model: string; usage: Usage | null };
export type Sender = (messages: Msg[]) => Promise<string | Reply>;
type Metadata = { model: string | null; usage: (Usage | null)[] };
export type MuseResult = Metadata & (
  | { ok: true; findings: Findings; raw: string; attempts: number }
  | { ok: false; errors: string[]; raw: string; attempts: number });
export const MUSE_DEFAULTS = { base: "https://api.meta.ai/v1", model: "muse-spark-1.3", timeoutMs: 30_000, maxTokens: 2048 } as const;
const hints: Record<number, string> = { 400: "Check model and request settings.", 401: "Check your local API key.", 403: "Check model access.", 402: "Check approved credits; no billing changes were made.", 429: "Rate limited; no automatic retry.", 500: "Provider error; no automatic retry.", 503: "Provider unavailable; no automatic retry." };
export function createMuseSender(options: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; timeoutMs?: number } = {}): Sender {
  return async (messages) => {
    const env = options.env ?? process.env;
    const key = (env.MODEL_API_KEY || env.META_API_KEY || "").trim();
    if (!key) throw new Error("No API key. Set MODEL_API_KEY in .env.local; never paste it in chat.");
    const model = env.MUSE_MODEL?.trim() || MUSE_DEFAULTS.model;
    const base = new URL(env.MUSE_BASE_URL?.trim() || MUSE_DEFAULTS.base);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash)
      throw new Error("MUSE_BASE_URL must be an HTTPS base URL without credentials, query or fragment.");
    const timeoutMs = options.timeoutMs ?? MUSE_DEFAULTS.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await (options.fetchImpl ?? fetch)(`${base.href.replace(/\/$/, "")}/chat/completions`, {
        method: "POST", redirect: "error", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, max_completion_tokens: MUSE_DEFAULTS.maxTokens }),
      });
      // Never echo provider bodies: they may contain secrets or submitted text.
      if (!response.ok) throw new Error(`Muse API ${response.status}. ${hints[response.status] ?? "Request failed; no automatic retry."}`);
      let body: any;
      try { body = await response.json(); } catch { throw new Error("Muse returned an invalid JSON response envelope."); }
      const raw = body?.choices?.[0]?.message?.content;
      if (typeof raw !== "string" || !raw.trim()) throw new Error("Muse returned no text completion.");
      const count = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : null;
      return { raw, model: typeof body.model === "string" ? body.model : model,
        usage: body.usage ? { prompt_tokens: count(body.usage.prompt_tokens), completion_tokens: count(body.usage.completion_tokens), total_tokens: count(body.usage.total_tokens) } : null };
    } catch (e) {
      if (controller.signal.aborted) throw new Error(`Muse request timed out after ${timeoutMs} ms; no automatic retry.`);
      if (e instanceof TypeError) throw new Error("Muse connection failed; check network and API configuration. No automatic retry.");
      throw e;
    } finally { clearTimeout(timer); }
  };
}
function parse(raw: string): { value?: unknown; errors: string[] } {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { errors: ["not valid JSON"] }; }
  return { value, errors: validateFindings(value) };
}
// At most two calls, with the second only for malformed/off-schema findings.
export async function harden(packet: string, send: Sender = createMuseSender()): Promise<MuseResult> {
  if (!packet.trim() || Buffer.byteLength(packet, "utf8") > 50_000) throw new Error("Packet must contain 1–50,000 UTF-8 bytes.");
  const messages: Msg[] = [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: packet }];
  const usage: (Usage | null)[] = []; let model: string | null = null; let raw = "";
  for (let attempts = 1; attempts <= 2; attempts++) {
    const reply = await send(messages);
    raw = typeof reply === "string" ? reply : reply.raw;
    if (typeof reply !== "string") model = reply.model;
    usage.push(typeof reply === "string" ? null : reply.usage);
    const parsed = parse(raw);
    if (!parsed.errors.length) return { ok: true, findings: parsed.value as Findings, raw, attempts, model, usage };
    if (attempts === 2) return { ok: false, errors: parsed.errors, raw, attempts, model, usage };
    messages.push({ role: "assistant", content: raw }, { role: "user", content: `Your reply failed the schema: ${parsed.errors.join("; ")}. Reply again with JSON only.` });
  }
  throw new Error("Unreachable");
}
