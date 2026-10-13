import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function issueAccessToken(claims, secret, ttlSeconds = 900, now = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ ...claims, iat: now, exp: now + ttlSeconds }));
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyAccessToken(token, secret, now = Math.floor(Date.now() / 1000)) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) throw new Error("Malformed token");
  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error("Invalid signature");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (claims.exp <= now) throw new Error("Token expired");
  return claims;
}

export class OtpChallengeStore {
  #challenges = new Map();

  create(subject, code, { ttlMs = 300_000, maxAttempts = 5, now = Date.now() } = {}) {
    this.#challenges.set(subject, { codeHash: hash(code), expiresAt: now + ttlMs, attempts: 0, maxAttempts, used: false });
  }

  verify(subject, code, now = Date.now()) {
    const challenge = this.#challenges.get(subject);
    if (!challenge || challenge.used) throw new Error("OTP is unavailable");
    if (challenge.expiresAt <= now) throw new Error("OTP expired");
    if (challenge.attempts >= challenge.maxAttempts) throw new Error("OTP attempts exhausted");
    challenge.attempts += 1;
    if (challenge.codeHash !== hash(code)) throw new Error("OTP is invalid");
    challenge.used = true;
    return true;
  }
}

export class RefreshTokenStore {
  #tokens = new Map();

  issue({ subject, familyId = randomBytes(12).toString("hex"), parentHash = null } = {}) {
    const raw = randomBytes(32).toString("base64url");
    const tokenHash = hash(raw);
    this.#tokens.set(tokenHash, { subject, familyId, parentHash, childHash: null, revoked: false });
    return { raw, familyId };
  }

  rotate(rawToken) {
    const tokenHash = hash(rawToken);
    const record = this.#tokens.get(tokenHash);
    if (!record) throw new Error("Unknown refresh token");
    if (record.revoked || record.childHash) {
      this.revokeFamily(record.familyId);
      throw new Error("Refresh-token reuse detected; family revoked");
    }
    const next = this.issue({ subject: record.subject, familyId: record.familyId, parentHash: tokenHash });
    record.childHash = hash(next.raw);
    record.revoked = true;
    return next;
  }

  revokeFamily(familyId) {
    for (const record of this.#tokens.values()) {
      if (record.familyId === familyId) record.revoked = true;
    }
  }

  isActive(rawToken) {
    const record = this.#tokens.get(hash(rawToken));
    return Boolean(record && !record.revoked);
  }
}
