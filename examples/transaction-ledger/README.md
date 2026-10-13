# Transaction-safe credit ledger

This independent example demonstrates fixed-scale money arithmetic, per-account serialization, immutable ledger entries, balance constraints, and idempotent mutations. The in-memory mutex makes the example runnable without dependencies; `postgres-pattern.sql` shows the corresponding `SELECT ... FOR UPDATE` transaction pattern.

The private product uses a database transaction and pessimistic row locking. This public code is a compact reconstruction, not copied application source.
