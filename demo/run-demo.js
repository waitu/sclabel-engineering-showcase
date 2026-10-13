import { InMemoryLedgerStore, LedgerService } from "../examples/transaction-ledger/ledger.js";
import { previewImport } from "../examples/data-import-pipeline/import-pipeline.js";
import { InMemoryQueue, RetryWorker } from "../examples/redis-job-queue/job-queue.js";
import { TrackingClient } from "../examples/api-integration/tracking-client.js";
import { RefreshTokenStore } from "../examples/authentication/session-security.js";

const store = new InMemoryLedgerStore();
store.createAccount("demo-account", 10);
const ledger = new LedgerService(store);
await ledger.apply({ accountId: "demo-account", amount: -1.5, type: "demo-order", idempotencyKey: "demo-order-1" });

const preview = previewImport("tracking,service,reference\nDEMO1234,standard,alpha\nDEMO1234,express,duplicate");

const queue = new InMemoryQueue();
await queue.enqueue({ idempotencyKey: "demo-job-1", payload: { trackingNumber: "DEMO1234" } });
const worker = new RetryWorker({ queue, handler: async (payload) => ({ accepted: payload.trackingNumber }) });
const jobResult = await worker.runOnce();

const fakeResponse = {
  ok: true,
  status: 200,
  headers: { get: () => null },
  json: async () => ({ items: [{ id: "DEMO1234", status: "moving" }], nextPage: null }),
};
const tracking = await new TrackingClient({ fetchImpl: async () => fakeResponse }).listAll();

const sessions = new RefreshTokenStore();
const firstToken = sessions.issue({ subject: "demo-user" });
const rotatedToken = sessions.rotate(firstToken.raw);

console.log(JSON.stringify({
  ledger: { balance: store.balance("demo-account"), entries: store.entries.length },
  importPreview: preview.summary,
  backgroundJob: { state: jobResult.state },
  integration: tracking,
  session: { oldTokenActive: sessions.isActive(firstToken.raw), rotatedTokenActive: sessions.isActive(rotatedToken.raw) },
}, null, 2));
