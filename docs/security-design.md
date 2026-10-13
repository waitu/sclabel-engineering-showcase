# Security design

## Verified private-system controls

- Global request validation with unknown-field rejection.
- Separate authenticated-user and administrator guards.
- Short-lived signed access tokens.
- Hashed OTP, refresh-token, and trusted-device secrets.
- OTP attempt limits and Redis-backed request throttling.
- Refresh rotation, revocation, reuse detection, and login audit events.
- Environment schema validation for required secrets and service configuration.
- Transactional balance changes with ledger records.
- CORS allow-list logic and explicit proxy boundaries.

These controls are evidence from source, not a penetration-test result.

## Showcase threat model

| Threat | Control in this showcase |
| --- | --- |
| Publishing a real secret | Placeholder-only `.env.example`; repository scanner |
| Leaking customer or order data | Synthetic fixtures only; no screenshots or exports |
| Copying proprietary implementation | Independent code and generic domain names |
| Duplicate financial mutation | Lock plus idempotency key |
| Retry duplicates | Processed-key store before delivery |
| Unbounded provider retry | Maximum attempts and bounded backoff |
| Refresh-token theft/reuse | Token-family revocation and audit event |
| Misleading capability claim | Explicit limitations and private/public distinction |

## Release integrity checks

1. Run `npm run verify` before each release.
2. Review every future screenshot manually; this showcase intentionally contains none.
3. Select a license only after confirming ownership of every file.
4. Review staged Git changes with the repository security scanner before each push.

## Scanner behavior

`scripts/security-scan.js` checks for private-key markers, credential-bearing URLs, secret assignments with non-placeholder values, production-domain references, sensitive archive types, source maps, and paths that point back to the private repository. It reports only file, line, and risk category.
