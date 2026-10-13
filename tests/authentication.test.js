import test from "node:test";
import assert from "node:assert/strict";
import { issueAccessToken, verifyAccessToken, OtpChallengeStore, RefreshTokenStore } from "../examples/authentication/session-security.js";

test("issues signed access tokens and rejects expiry", () => {
  const token = issueAccessToken({ sub: "user-1", role: "member" }, "local-test-secret", 10, 100);
  assert.equal(verifyAccessToken(token, "local-test-secret", 105).sub, "user-1");
  assert.throws(() => verifyAccessToken(token, "local-test-secret", 110), /expired/);
});

test("enforces OTP attempt limits and single use", () => {
  const store = new OtpChallengeStore();
  store.create("user-1", "123456", { maxAttempts: 2, now: 1_000 });
  assert.throws(() => store.verify("user-1", "000000", 1_001), /invalid/);
  assert.equal(store.verify("user-1", "123456", 1_002), true);
  assert.throws(() => store.verify("user-1", "123456", 1_003), /unavailable/);
});

test("detects refresh-token reuse and revokes the whole family", () => {
  const store = new RefreshTokenStore();
  const first = store.issue({ subject: "user-1" });
  const second = store.rotate(first.raw);
  assert.equal(store.isActive(second.raw), true);
  assert.throws(() => store.rotate(first.raw), /reuse detected/);
  assert.equal(store.isActive(second.raw), false);
});
