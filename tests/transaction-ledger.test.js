import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryLedgerStore, LedgerService } from "../examples/transaction-ledger/ledger.js";

test("serializes concurrent mutations and preserves a non-negative balance", async () => {
  const store = new InMemoryLedgerStore();
  store.createAccount("account-1", 10);
  const ledger = new LedgerService(store);
  const results = await Promise.allSettled([
    ledger.apply({ accountId: "account-1", amount: -7, type: "purchase", idempotencyKey: "purchase-a" }),
    ledger.apply({ accountId: "account-1", amount: -7, type: "purchase", idempotencyKey: "purchase-b" }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(store.balance("account-1"), 3);
});

test("returns the original entry for an idempotent replay", async () => {
  const store = new InMemoryLedgerStore();
  store.createAccount("account-1", 1);
  const ledger = new LedgerService(store);
  const command = { accountId: "account-1", amount: 2.5, type: "topup", idempotencyKey: "external-event-1" };
  const first = await ledger.apply(command);
  const replay = await ledger.apply(command);
  assert.equal(replay, first);
  assert.equal(store.balance("account-1"), 3.5);
  assert.equal(store.entries.length, 1);
});
