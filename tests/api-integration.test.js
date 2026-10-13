import test from "node:test";
import assert from "node:assert/strict";
import { TrackingClient } from "../examples/api-integration/tracking-client.js";

function response(status, body, headers = {}) {
  return { ok: status >= 200 && status < 300, status, headers: { get: (name) => headers[name.toLowerCase()] ?? null }, json: async () => body };
}

test("honors rate-limit retry and normalizes paginated statuses", async () => {
  const replies = [
    response(429, {}, { "retry-after": "0" }),
    response(200, { items: [{ id: 1, status: "accepted" }], nextPage: 2 }),
    response(200, { items: [{ id: 2, status: "DELIVERED" }], nextPage: null }),
  ];
  const waits = [];
  const client = new TrackingClient({ fetchImpl: async () => replies.shift(), wait: async (ms) => waits.push(ms) });
  assert.deepEqual(await client.listAll(), [{ id: "1", status: "in_transit" }, { id: "2", status: "delivered" }]);
  assert.equal(waits.length, 1);
});

test("stops at the pagination safety limit", async () => {
  const client = new TrackingClient({ fetchImpl: async () => response(200, { items: [], nextPage: true }) });
  await assert.rejects(() => client.listAll({ maxPages: 2 }), /safety limit/);
});

test("does not retry a non-transient client error", async () => {
  let calls = 0;
  const client = new TrackingClient({
    fetchImpl: async () => { calls += 1; return response(400, {}); },
    wait: async () => {},
  });
  await assert.rejects(() => client.listAll(), /HTTP 400/);
  assert.equal(calls, 1);
});
