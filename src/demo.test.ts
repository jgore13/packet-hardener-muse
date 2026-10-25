import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function page() {
  class Element {
    textContent = ""; value = ""; hidden = true; disabled = false; className = "";
    children: any[] = []; listeners: Record<string, Function> = {};
    addEventListener(name: string, fn: Function) { this.listeners[name] = fn; }
    append(...xs: any[]) { this.children.push(...xs); }
    replaceChildren(...xs: any[]) { this.children = xs; }
    focus() {}
  }
  const elements: Record<string, Element> = {};
  const get = (id: string) => elements[id] ??= new Element();
  const requests: { url: string; body: any; resolve: Function; reject: Function }[] = [];
  const html = readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)![1], {
    document: { getElementById: get, createElement: () => new Element(), createTextNode: (s: any) => String(s) },
    fetch: (url: string, options: any) => url === "/api/packets"
      ? Promise.resolve({ json: async () => ({ mode: "stub", packets: [] }) })
      : new Promise((resolve, reject) => requests.push({ url, body: JSON.parse(options.body), resolve: (v: any) => resolve({ json: async () => v }), reject })),
    Blob, URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
  });
  return { get, requests, click: (id: string) => get(id).listeners.click(), edit: (s: string) => { get("packet").value = s; get("packet").listeners.input(); } };
}
const reply = { ok: true, run_id: "server-run", raw: "raw", attempts: 1, score: { score: 8, lines: [] }, hits: null,
  findings: { failures: [{ class: "undefined_number", quote: "70", why: "No formula", fix: "Supply a formula" }], blockers: ["Define score"], red_test: "score_is_defined", rollback: "Undo" } };

test("editing while analysis runs cannot expose a stale ruling", async () => {
  const p = page(); p.edit("old"); const pending = p.click("run"); p.edit("new");
  p.requests[0].resolve(reply); await pending;
  assert.equal(p.get("chairBlock").hidden, true);
  assert.equal(p.get("status").textContent, "NOT_READY");
});

test("demo shows fixes and blockers; ruling sends only the server run and exact packet", async () => {
  const p = page(); p.edit("packet"); const pending = p.click("run"); p.requests[0].resolve(reply); await pending;
  assert.match(JSON.stringify(p.get("findings").children), /Supply a formula/);
  assert.match(JSON.stringify(p.get("blockers").children), /Define score/);
  p.get("ruling").value = "Synthetic test only"; const ruled = p.click("accept");
  assert.equal(p.requests[1].body.run_id, "server-run"); assert.equal(p.requests[1].body.packet, "packet");
  assert.equal(p.requests[1].body.run, undefined);
  p.requests[1].resolve({ receipt: { decision: "ACCEPTED" }, file: "receipts/test.json" }); await ruled;
  assert.equal(p.get("status").textContent, "ACCEPTED");
});

test("editing while a ruling is saved cannot accept the new text", async () => {
  const p = page(); p.edit("old"); const pending = p.click("run"); p.requests[0].resolve(reply); await pending;
  p.get("ruling").value = "Synthetic"; const ruled = p.click("accept"); p.edit("new");
  p.requests[1].resolve({ receipt: {}, file: "receipts/test.json" }); await ruled;
  assert.equal(p.get("status").textContent, "NOT_READY"); assert.equal(p.get("download").hidden, true);
});

test("a failed ruling stays unaccepted and reports its error", async () => {
  const p = page(); p.edit("packet"); const pending = p.click("run"); p.requests[0].resolve(reply); await pending;
  p.get("ruling").value = "Synthetic"; const ruled = p.click("accept");
  p.requests[1].reject(new Error("Offline")); await ruled;
  assert.equal(p.get("status").textContent, "NOT_READY"); assert.match(p.get("chairnote").textContent, /Offline/);
});
