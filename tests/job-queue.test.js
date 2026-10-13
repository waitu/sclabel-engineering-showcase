import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryQueue, RetryWorker } from "../examples/redis-job-queue/job-queue.js";

test("retries transient failures and completes exactly once", async () => {
  const queue = new InMemoryQueue();
  await queue.enqueue({ idempotencyKey: "job-1", payload: { value: 2 } });
  let calls = 0;
  const worker = new RetryWorker({
    queue,
    wait: async () => {},
    handler: async ({ value }) => {
      calls += 1;
      if (calls === 1) throw new Error("temporary");
      return value * 2;
    },
  });
  assert.equal((await worker.runOnce()).state, "retrying");
  const completed = await worker.runOnce();
  assert.equal(completed.state, "completed");
  assert.equal(completed.result, 4);
  assert.equal(worker.deadLetters.length, 0);
});

test("moves a repeatedly failing job to the dead-letter collection", async () => {
  const queue = new InMemoryQueue();
  await queue.enqueue({ idempotencyKey: "job-2", payload: {} });
  const worker = new RetryWorker({ queue, maxAttempts: 2, wait: async () => {}, handler: async () => { throw new Error("permanent"); } });
  await worker.runOnce();
  assert.equal((await worker.runOnce()).state, "dead-lettered");
  assert.equal(worker.deadLetters.length, 1);
});
