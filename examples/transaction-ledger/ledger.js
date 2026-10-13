const SCALE = 100;

export function toMinorUnits(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new TypeError("Amount must be finite");
  return Math.round(amount * SCALE);
}

export function fromMinorUnits(value) {
  return value / SCALE;
}

class KeyedMutex {
  #tails = new Map();

  async run(key, operation) {
    const previous = this.#tails.get(key) ?? Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    this.#tails.set(key, current);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.#tails.get(key) === current) this.#tails.delete(key);
    }
  }
}

export class InMemoryLedgerStore {
  accounts = new Map();
  entries = [];
  idempotencyKeys = new Set();

  createAccount(accountId, openingBalance = 0) {
    if (this.accounts.has(accountId)) throw new Error("Account already exists");
    this.accounts.set(accountId, toMinorUnits(openingBalance));
  }

  balance(accountId) {
    if (!this.accounts.has(accountId)) throw new Error("Account not found");
    return fromMinorUnits(this.accounts.get(accountId));
  }
}

export class LedgerService {
  #locks = new KeyedMutex();

  constructor(store = new InMemoryLedgerStore()) {
    this.store = store;
  }

  async apply({ accountId, amount, type, idempotencyKey, metadata = {} }) {
    if (!idempotencyKey) throw new Error("idempotencyKey is required");
    const delta = toMinorUnits(amount);
    if (delta === 0) throw new Error("Amount must be non-zero");

    return this.#locks.run(accountId, async () => {
      if (this.store.idempotencyKeys.has(idempotencyKey)) {
        return this.store.entries.find((entry) => entry.idempotencyKey === idempotencyKey);
      }
      const current = this.store.accounts.get(accountId);
      if (current === undefined) throw new Error("Account not found");
      const next = current + delta;
      if (next < 0) throw new Error("Insufficient balance");

      const entry = Object.freeze({
        id: `entry-${this.store.entries.length + 1}`,
        accountId,
        type,
        amount: fromMinorUnits(delta),
        balanceAfter: fromMinorUnits(next),
        idempotencyKey,
        metadata: structuredClone(metadata),
      });
      this.store.accounts.set(accountId, next);
      this.store.idempotencyKeys.add(idempotencyKey);
      this.store.entries.push(entry);
      return entry;
    });
  }
}
