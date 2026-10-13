# Engineering decisions

## Fixed-scale values instead of floating-point arithmetic

The ledger example converts credits to hundredths before mutation. This makes comparisons and concurrent deductions deterministic. The private system uses PostgreSQL `numeric` columns and explicit numeric transformers.

## Lock the smallest consistency boundary

A balance mutation locks one account, not the entire ledger. A top-up decision locks the reviewed record and applies its ledger mutation within the same transaction. This prevents double approval while retaining concurrency across unrelated accounts.

## Idempotency before side effects

The public ledger and worker examples check an idempotency key before mutation or delivery. This turns retries into safe reads of an earlier result rather than duplicate effects.

## Preview before commit

Bulk data is normalized and validated before persistence. Errors remain attached to source row numbers, allowing users to correct input without partially committing an invalid file.

## Ports and adapters for infrastructure

The queue worker depends on a small queue interface. Tests use an in-memory adapter; a Redis adapter can implement the same contract. The API client receives a `fetch` function, which keeps provider behavior deterministic in tests.

## Bounded retries

Only transient network errors and rate limits are retried. Attempts, wait duration, pages, and batches are bounded. Permanent failures move to an explicit dead-letter result rather than looping indefinitely.

## Revoke a refresh-token family after reuse

Rotation alone is insufficient when an old token is stolen. Reuse invalidates the entire family and records a security event, forcing a fresh login.

## Deliberate omissions

The showcase excludes private schemas, provider-specific payloads, UI source, deployment endpoints, and screenshots. It also avoids presenting the private worker's simulated branch as a completed external activation workflow.
