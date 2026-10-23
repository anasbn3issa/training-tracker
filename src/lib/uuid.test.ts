import { describe, expect, it } from "vitest";
import { z } from "zod";
import { uuid, uuidFromBytes } from "./uuid";

describe("uuid", () => {
  it("formats 16 random bytes as a valid v4 uuid", () => {
    const id = uuidFromBytes(new Uint8Array(16).fill(255));
    expect(id).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(z.uuid().safeParse(id).success).toBe(true);
  });

  it("generates distinct valid ids", () => {
    const a = uuid();
    expect(z.uuid().safeParse(a).success).toBe(true);
    expect(a).not.toBe(uuid());
  });
});
