import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { authToken, userFromToken } from "./auth";

// Random per run: no credential-looking literals in the repo for secret scanners to flag.
const random = () => randomBytes(18).toString("base64url");
const env = { secret: random() };

describe("auth", () => {
  it("the cookie token names the user", () => {
    expect(authToken("anas", env).startsWith("anas.")).toBe(true);
  });

  it("reads the user back from a valid token", () => {
    expect(userFromToken(authToken("anas", env), env)).toBe("anas");
    expect(userFromToken(authToken("atef", env), env)).toBe("atef");
    const uuid = crypto.randomUUID();
    expect(userFromToken(authToken(uuid, env), env)).toBe(uuid);
  });

  it("rejects tampered, missing or re-labelled tokens", () => {
    const anas = authToken("anas", env);
    expect(userFromToken(anas + "x", env)).toBeNull();
    expect(userFromToken(undefined, env)).toBeNull();
    expect(userFromToken("garbage", env)).toBeNull();
    expect(userFromToken(".sig", env)).toBeNull();
    // Anas's signature with Atef's name in front must not log in as Atef.
    expect(userFromToken(anas.replace("anas.", "atef."), env)).toBeNull();
  });

  it("rotating the secret logs everyone out", () => {
    expect(userFromToken(authToken("anas", env), { secret: random() })).toBeNull();
  });
});
