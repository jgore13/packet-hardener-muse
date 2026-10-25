import { test } from "node:test";
import assert from "node:assert/strict";
import { createMuseSender, harden } from "./muse.ts";
import { STUB_REPLY } from "./stub.ts";
import { cliDecision, validateRuling } from "./ruling.ts";

test("Meta request is pinned and bounded; actual usage is retained", async () => {
  let calls = 0;
  const send = createMuseSender({ env: { MODEL_API_KEY: "offline-placeholder" }, fetchImpl: (async (url: any, init: any) => {
    calls++; assert.equal(url, "https://api.meta.ai/v1/chat/completions");
    const body = JSON.parse(init.body); assert.equal(body.model, "muse-spark-1.3"); assert.equal(body.max_completion_tokens, 2048);
    assert.equal(body.temperature, undefined); assert.equal(init.redirect, "error"); assert.ok(init.signal);
    assert.equal(body.messages.length, 2); assert.equal(body.messages[1].content, "Synthetic packet");
    return new Response(JSON.stringify({ choices: [{ message: { content: STUB_REPLY } }], model: "muse-spark-1.3", usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 } }));
  }) as typeof fetch });
  const result = await harden("Synthetic packet", send); assert.equal(result.ok, true); assert.equal(calls, 1);
  assert.deepEqual(result.usage, [{ prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 }]);
});
test("missing key and insecure base fail before any request", async () => {
  let calls = 0; const fetchImpl = (async () => { calls++; throw new Error("should not call"); }) as typeof fetch;
  await assert.rejects(createMuseSender({ env: {}, fetchImpl })([]), /No API key/);
  await assert.rejects(createMuseSender({ env: { MODEL_API_KEY: "offline", MUSE_BASE_URL: "http://example.com" }, fetchImpl })([]), /HTTPS/);
  assert.equal(calls, 0);
});
test("provider error is useful without echoing the body or retrying", async () => {
  let calls = 0;
  const send = createMuseSender({ env: { MODEL_API_KEY: "offline" }, fetchImpl: (async () => { calls++; return new Response("PRIVATE BODY", { status: 429 }); }) as typeof fetch });
  await assert.rejects(harden("packet", send), (e: Error) => /429/.test(e.message) && !e.message.includes("PRIVATE BODY")); assert.equal(calls, 1);
});
test("timeout aborts a request and does not trigger schema retry", async () => {
  let calls = 0;
  const send = createMuseSender({ env: { MODEL_API_KEY: "offline" }, timeoutMs: 10, fetchImpl: ((_url: any, init: any) => {
    calls++; return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("abort"))));
  }) as typeof fetch });
  await assert.rejects(harden("packet", send), /timed out/); assert.equal(calls, 1);
});
test("missing completion is an envelope error and missing usage stays unknown", async () => {
  const invalid = createMuseSender({ env: { MODEL_API_KEY: "offline" }, fetchImpl: (async () => new Response("{}")) as typeof fetch });
  await assert.rejects(invalid([]), /no text completion/);
  const result = await harden("packet", async () => STUB_REPLY); assert.deepEqual(result.usage, [null]);
});
test("oversized input fails before any sender call", async () => {
  let calls = 0; await assert.rejects(harden("x".repeat(50_001), async () => { calls++; return STUB_REPLY; }), /50,000/); assert.equal(calls, 0);
});
test("CLI and browser rulings refuse invalid, blank, long and multiline choices", () => {
  assert.equal(cliDecision("accept"), "ACCEPTED"); assert.equal(cliDecision("o"), "OVERRIDDEN");
  for (const c of ["", "anything", "apple"]) assert.throws(() => cliDecision(c));
  for (const r of ["", " ", "x".repeat(201), "two\nlines"]) assert.throws(() => validateRuling("ACCEPTED", r));
  assert.deepEqual(validateRuling("ACCEPTED", " Synthetic "), { decision: "ACCEPTED", ruling: "Synthetic" });
});
