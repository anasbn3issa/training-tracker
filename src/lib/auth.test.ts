import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { authToken, passwordMatches, userFromToken } from "./auth";

// Random per run: no credential-looking literals in the repo for secret scanners to flag.
const random = () => randomBytes(18).toString("base64url");
const anasPassword = random();
const atefPassword = random();
const env = { secret: random(), passwords: { anas: anasPassword, atef: atefPassword } };

describe("auth", () => {
  it("accepts each user's own password only", () => {
    expect(passwordMatches("anas", anasPassword, env)).toBe(true);
    expect(passwordMatches("anas", atefPassword, env)).toBe(false);
    expect(passwordMatches("atef", atefPassword, env)).toBe(true);
    expect(passwordMatches("anas", "", env)).toBe(false);
  });

  it("rejects unknown users and users without a configured password", () => {
    expect(passwordMatches("mallory", anasPassword, env)).toBe(false);
    expect(passwordMatches("atef", atefPassword, { ...env, passwords: { anas: anasPassword } })).toBe(false);
  });

  it("the cookie token names the user but does not contain the password", () => {
    const token = authToken("anas", env);
    expect(token.startsWith("anas.")).toBe(true);
    expect(token).not.toContain(anasPassword);
  });

  it("reads the user back from a valid token", () => {
    expect(userFromToken(authToken("anas", env), env)).toBe("anas");
    expect(userFromToken(authToken("atef", env), env)).toBe("atef");
  });

  it("rejects tampered, missing or re-labelled tokens", () => {
    const anas = authToken("anas", env);
    expect(userFromToken(anas + "x", env)).toBeNull();
    expect(userFromToken(undefined, env)).toBeNull();
    expect(userFromToken("garbage", env)).toBeNull();
    // Anas's signature with Atef's name in front must not log in as Atef.
    expect(userFromToken(anas.replace("anas.", "atef."), env)).toBeNull();
  });

  it("changing a user's password logs out only that user", () => {
    const anas = authToken("anas", env);
    const atef = authToken("atef", env);
    const changed = { ...env, passwords: { ...env.passwords, anas: random() } };
    expect(userFromToken(anas, changed)).toBeNull();
    expect(userFromToken(atef, changed)).toBe("atef");
  });
});
