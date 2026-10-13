# Resilient external-API client

This client uses injected transport, request timeouts, bounded retry with backoff, `Retry-After` handling, pagination limits, and provider-status normalization. Tests use deterministic fake responses; the example never contacts a live service.

Provider names, endpoints, authentication, and payloads from the private product are deliberately excluded.
