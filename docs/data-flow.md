# Data flow

## Bulk import

```mermaid
sequenceDiagram
  actor User
  participant Parser
  participant Validator
  participant Preview
  participant Store
  participant Queue

  User->>Parser: Upload synthetic CSV
  Parser->>Validator: Canonical rows
  Validator->>Validator: Validate and detect duplicates
  Validator-->>User: Row-level preview and errors
  User->>Preview: Confirm valid preview
  Preview->>Store: Commit accepted rows in batches
  Store->>Queue: Enqueue follow-up jobs
  Queue-->>User: Import summary
```

The private system implements a two-step spreadsheet preview/confirmation flow. The public example stops at deterministic validation and chunk construction because it has no production database or queue.

## Credit mutation

```mermaid
sequenceDiagram
  participant Request
  participant Lock
  participant Account
  participant Ledger

  Request->>Lock: Acquire account lock
  Lock->>Ledger: Check idempotency key
  Ledger-->>Lock: Existing result or miss
  Lock->>Account: Validate available balance
  Lock->>Account: Apply fixed-scale mutation
  Lock->>Ledger: Append immutable entry
  Lock-->>Request: Balance and ledger entry
```

## External status synchronization

```mermaid
flowchart LR
  SELECT[Select eligible records] --> PAGE[Fetch bounded page]
  PAGE --> RETRY{Retryable?}
  RETRY -->|429 or transient| WAIT[Honor delay/backoff]
  WAIT --> PAGE
  RETRY -->|Success| NORMALIZE[Normalize provider status]
  NORMALIZE --> TRANSITION[Apply allowed state transition]
  TRANSITION --> AUDIT[Persist summary/audit]
```
