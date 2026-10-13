# Retryable background-job workflow

This example separates a queue port from worker behavior, then demonstrates bounded retries, exponential backoff, idempotent completion, and a dead-letter terminal state. It uses an in-memory adapter so it runs locally with no infrastructure.

The private application uses Redis list operations and a blocking worker. The adapter here intentionally avoids production keys, payloads, and network dependencies.
