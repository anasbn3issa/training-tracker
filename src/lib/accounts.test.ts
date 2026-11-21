import { describe, expect, it } from "vitest";
import { canSignIn, resolveAccount, type AccountStore } from "./accounts";

type Row = { id: string; name: string; email: string | null; sub: string | null };

/** In-memory stand-in for the users table, with its unique email and google_sub. */
function memoryStore(rows: Row[]): AccountStore & { rows: Row[] } {
  const pick = (r: Row) => ({ id: r.id, name: r.name });
  return {
    rows,
    async findBySub(sub) {
      const row = rows.find((r) => r.sub === sub);
      return row ? pick(row) : null;
    },
    async claimByEmail(email, sub) {
      const row = rows.find((r) => r.email === email && r.sub === null);
      if (!row) return null;
      row.sub = sub;
      return pick(row);
    },
    async create({ id, name, email, sub }) {
      if (rows.some((r) => r.email === email || r.sub === sub)) throw new Error("duplicate key");
      rows.push({ id, name, email, sub });
      return { id, name };
    },
  };
}

const newId = () => "new-id";

describe("resolveAccount", () => {
  it("an existing user whose email was set by hand claims their row on first sign-in", async () => {
    const store = memoryStore([{ id: "anas", name: "Anas", email: "anas@gmail.com", sub: null }]);
    const account = await resolveAccount(store, { sub: "g-anas", email: "anas@gmail.com", name: "A" }, newId);
    expect(account).toEqual({ id: "anas", name: "Anas" });
    expect(store.rows[0].sub).toBe("g-anas");
  });

  it("finds an already linked user by their Google id, even if their email changed", async () => {
    const store = memoryStore([{ id: "anas", name: "Anas", email: "anas@gmail.com", sub: "g-anas" }]);
    const account = await resolveAccount(store, { sub: "g-anas", email: "new@gmail.com", name: "A" }, newId);
    expect(account).toEqual({ id: "anas", name: "Anas" });
    expect(store.rows).toHaveLength(1);
  });

  it("creates a new user for an unknown Google account", async () => {
    const store = memoryStore([{ id: "anas", name: "Anas", email: "anas@gmail.com", sub: "g-anas" }]);
    const account = await resolveAccount(store, { sub: "g-new", email: "new@gmail.com", name: "Newbie" }, newId);
    expect(account).toEqual({ id: "new-id", name: "Newbie" });
    expect(store.rows).toHaveLength(2);
  });

  it("never takes over a user already linked to another Google account", async () => {
    const store = memoryStore([{ id: "anas", name: "Anas", email: "anas@gmail.com", sub: "g-anas" }]);
    await expect(resolveAccount(store, { sub: "g-other", email: "anas@gmail.com", name: "X" }, newId)).rejects.toThrow();
    expect(store.rows).toEqual([{ id: "anas", name: "Anas", email: "anas@gmail.com", sub: "g-anas" }]);
  });
});

describe("canSignIn", () => {
  it("lets an existing, active user in", () => {
    expect(canSignIn({ disabled_at: null })).toBe(true);
  });

  it("refuses a blocked user", () => {
    expect(canSignIn({ disabled_at: "2026-11-21T22:00:00Z" })).toBe(false);
  });

  it("refuses a deleted user whose cookie is still valid", () => {
    expect(canSignIn(null)).toBe(false);
  });
});
