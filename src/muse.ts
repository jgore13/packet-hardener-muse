// Server-only. Never import this from browser code: it reads the API key.
import { SYSTEM_PROMPT } from "./prompt.ts";
import { validateFindings, type Findings } from "./schema.ts";

export type MuseResult =
  | { ok: true; findings: Findings; raw: string; attempts: number }
  | { ok: false; errors: string[]; raw: string; attempts: number };

type Msg = { role: "system" | "user" | "assistant"; content: string };

function config() {
  const key = process.env.MODEL_API_KEY || process.env.META_API_KEY;
  const model = process.env.MUSE_MODEL;
  const base = (process.env.MUSE_BASE_URL || "https://api.llama.com/compat/v1").replace(/\/$/, "");
  if (!key) throw new Error("No API key. Set MODEL_API_KEY (or META_API_KEY) in .env.local.");
  if (!model) throw new Error("No model. Set MUSE_MODEL in .env.local to the Muse model ID from Meta's docs.");
  return { key, model, base };
}

// Accepts the OpenAI-compatible shape and Meta's native Llama API shape.
function extractText(body: any): string {
  return (
    body?.choices?.[0]?.message?.content ??
    body?.completion_message?.content?.text ??
    (typeof body?.completion_message?.content === "string" ? body.completion_message.content : "")
  );
}

function parse(raw: string): { value?: unknown; errors: string[] } {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    return { errors: [`not valid JSON: ${(e as Error).message}`] };
  }
  return { value, errors: validateFindings(value) };
}

async function call(messages: Msg[]): Promise<string> {
  const { key, model, base } = config();
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0 }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Muse API ${res.status}: ${body.slice(0, 500)}`);
  return extractText(JSON.parse(body));
}

// One call. One retry on malformed or off-schema JSON, with the errors fed back.
export async function harden(packet: string, send: (m: Msg[]) => Promise<string> = call): Promise<MuseResult> {
  const messages: Msg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: packet },
  ];
  let raw = await send(messages);
  let p = parse(raw);
  if (p.errors.length === 0) return { ok: true, findings: p.value as Findings, raw, attempts: 1 };

  messages.push(
    { role: "assistant", content: raw },
    { role: "user", content: `Your reply failed the schema: ${p.errors.join("; ")}. Reply again with JSON only.` },
  );
  raw = await send(messages);
  p = parse(raw);
  if (p.errors.length === 0) return { ok: true, findings: p.value as Findings, raw, attempts: 2 };
  return { ok: false, errors: p.errors, raw, attempts: 2 };
}
