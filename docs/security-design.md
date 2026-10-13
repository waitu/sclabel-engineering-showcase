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

| Threat | Control in this draft |
| --- | --- |
| Publishing a real secret | Placeholder-only `.env.example`; repository scanner |
| Leaking customer or order data | Synthetic fixtures only; no screenshots or exports |
| Copying proprietary implementation | Independent code and generic domain names |
| Duplicate financial mutation | Lock plus idempotency key |
| Retry duplicates | Processed-key store before delivery |
| Unbounded provider retry | Maximum attempts and bounded backoff |
| Refresh-token theft/reuse | Token-family revocation and audit event |
| Misleading capability claim | Explicit limitations and private/public distinction |

## Pre-publication checklist

1. Run `npm run verify`.
2. Confirm no `.git` directory was copied from the private repository.
3. Review every screenshot manually; this draft intentionally contains none.
4. Confirm the project name and original-system description are approved for public use.
5. Select a license only after confirming ownership of every file.
6. Create a new empty GitHub repository; do not fork the private repository.
7. Review staged Git changes with a secret scanner before the first push.

## Scanner behavior

`scripts/security-scan.js` checks for private-key markers, credential-bearing URLs, secret assignments with non-placeholder values, production-domain references, sensitive archive types, source maps, and paths that point back to the private repository. It reports only file, line, and risk category.
