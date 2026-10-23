import { describe, expect, it } from "vitest";
import { authToken, isValidToken, passwordMatches } from "./auth";

const env = { password: "hunter2-but-longer", secret: "a-long-random-secret" };

describe("auth", () => {
  it("accepts the right password and rejects others", () => {
    expect(passwordMatches("hunter2-but-longer", env)).toBe(true);
    expect(passwordMatches("hunter2", env)).toBe(false);
    expect(passwordMatches("", env)).toBe(false);
  });

  it("the cookie token is not the password", () => {
    expect(authToken(env)).not.toContain(env.password);
  });

  it("validates its own token and rejects tampered or missing ones", () => {
    expect(isValidToken(authToken(env), env)).toBe(true);
    expect(isValidToken(authToken(env) + "x", env)).toBe(false);
    expect(isValidToken(undefined, env)).toBe(false);
  });

  it("changing the password invalidates existing tokens", () => {
    const old = authToken(env);
    expect(isValidToken(old, { ...env, password: "new-password" })).toBe(false);
  });
});
