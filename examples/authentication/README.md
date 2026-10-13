# Session-security patterns

This standalone example covers signed short-lived access tokens, single-use OTP challenges with expiry and attempt limits, hashed refresh-token storage, rotation chains, and refresh-family revocation after reuse detection.

It is educational code, not a drop-in identity provider. The private implementation additionally integrates application guards, device trust, audit events, and request-level rate limits.
