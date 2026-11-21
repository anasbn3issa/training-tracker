import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { authorizeUrl, newOAuthAttempt, oauthCookieValue, parseOAuthCookie, profileFromIdToken } from "./google";

const CLIENT = "client-123.apps.googleusercontent.com";
const NOW = 1_800_000_000;

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const idToken = (claims: object) => `${b64({ alg: "RS256" })}.${b64(claims)}.signature`;

const valid = {
  iss: "https://accounts.google.com",
  aud: CLIENT,
  exp: NOW + 600,
  sub: "1234567890",
  email: "Someone@Gmail.com",
  email_verified: true,
  given_name: "Someone",
  name: "Someone Else",
};

describe("profileFromIdToken", () => {
  it("returns the account with a lowercased email and the given name", () => {
    expect(profileFromIdToken(idToken(valid), CLIENT, NOW)).toEqual({
      sub: "1234567890",
      email: "someone@gmail.com",
      name: "Someone",
    });
  });

  it("falls back to the full name, then the email's local part", () => {
    expect(profileFromIdToken(idToken({ ...valid, given_name: undefined }), CLIENT, NOW)?.name).toBe("Someone Else");
    expect(profileFromIdToken(idToken({ ...valid, given_name: " ", name: undefined }), CLIENT, NOW)?.name).toBe("someone");
  });

  it("rejects tokens for another client, from another issuer, or expired", () => {
    expect(profileFromIdToken(idToken({ ...valid, aud: "other" }), CLIENT, NOW)).toBeNull();
    expect(profileFromIdToken(idToken({ ...valid, iss: "https://evil.example" }), CLIENT, NOW)).toBeNull();
    expect(profileFromIdToken(idToken({ ...valid, exp: NOW }), CLIENT, NOW)).toBeNull();
  });

  it("rejects unverified or missing emails", () => {
    expect(profileFromIdToken(idToken({ ...valid, email_verified: false }), CLIENT, NOW)).toBeNull();
    expect(profileFromIdToken(idToken({ ...valid, email: undefined }), CLIENT, NOW)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(profileFromIdToken("garbage", CLIENT, NOW)).toBeNull();
    expect(profileFromIdToken("a.%%%.c", CLIENT, NOW)).toBeNull();
  });
});

describe("oauth attempt", () => {
  it("the challenge is the SHA-256 of the verifier", () => {
    const { verifier, challenge } = newOAuthAttempt();
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });

  it("round-trips state and verifier through the cookie", () => {
    const { state, verifier } = newOAuthAttempt();
    expect(parseOAuthCookie(oauthCookieValue(state, verifier))).toEqual({ state, verifier });
    expect(parseOAuthCookie(undefined)).toBeNull();
    expect(parseOAuthCookie("only-one")).toBeNull();
    expect(parseOAuthCookie("a.b.c")).toBeNull();
  });

  it("asks Google for an S256 PKCE code with openid email profile", () => {
    const url = new URL(authorizeUrl({ clientId: CLIENT, redirectUri: "https://app/cb", state: "s", challenge: "c" }));
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app/cb");
  });
});
