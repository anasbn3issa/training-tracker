import { describe, expect, it } from "vitest";
import { authToken, passwordMatches, userFromToken } from "./auth";

const env = { secret: "a-long-random-secret", passwords: { anas: "anas-long-password", atef: "atef-long-password" } };

describe("auth", () => {
  it("accepts each user's own password only", () => {
    expect(passwordMatches("anas", "anas-long-password", env)).toBe(true);
    expect(passwordMatches("anas", "atef-long-password", env)).toBe(false);
    expect(passwordMatches("atef", "atef-long-password", env)).toBe(true);
    expect(passwordMatches("anas", "", env)).toBe(false);
  });

  it("rejects unknown users and users without a configured password", () => {
    expect(passwordMatches("mallory", "anas-long-password", env)).toBe(false);
    expect(passwordMatches("atef", "atef-long-password", { ...env, passwords: { anas: "anas-long-password" } })).toBe(false);
  });

  it("the cookie token names the user but does not contain the password", () => {
    const token = authToken("anas", env);
    expect(token.startsWith("anas.")).toBe(true);
    expect(token).not.toContain(env.passwords.anas);
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
    const changed = { ...env, passwords: { ...env.passwords, anas: "new-password-for-anas" } };
    expect(userFromToken(anas, changed)).toBeNull();
    expect(userFromToken(atef, changed)).toBe("atef");
  });
});
