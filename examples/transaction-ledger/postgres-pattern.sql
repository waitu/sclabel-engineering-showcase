-- Generic production pattern. This schema is illustrative and contains no private data.
CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  balance_minor bigint NOT NULL DEFAULT 0 CHECK (balance_minor >= 0)
);

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id),
  amount_minor bigint NOT NULL CHECK (amount_minor <> 0),
  balance_after_minor bigint NOT NULL CHECK (balance_after_minor >= 0),
  entry_type text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

BEGIN;
SELECT balance_minor FROM accounts WHERE id = $1 FOR UPDATE;
UPDATE accounts SET balance_minor = balance_minor + $2 WHERE id = $1;
INSERT INTO ledger_entries
  (id, account_id, amount_minor, balance_after_minor, entry_type, idempotency_key)
VALUES ($3, $1, $2, $4, $5, $6);
COMMIT;
