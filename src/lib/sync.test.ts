import { describe, expect, it } from "vitest";
import { applyOps } from "./ops";
import { SyncStore, type Kv, type KvSchema } from "./sync";
import type { LogState, Op, Program, Run, Session, SetLog } from "./types";

const program: Program = { days: [], prescriptions: [], exercises: [] };
const START = "2026-09-21";
const TODAY = "2026-10-26";

const session: Session = { id: "s1", day_code: "A", date: TODAY, block_week: 5, notes: null, title: null, completed_at: null };
const set = (id: string, reps = 10): SetLog => ({
  id,
  session_id: "s1",
  exercise_id: "incline-db-press",
  set_index: 1,
  weight_kg: 27.5,
  reps,
  done_at: `${TODAY}T18:00:00Z`,
});
const upsertSet = (id: string, reps = 10): Op => ({ kind: "upsert", table: "set_logs", row: set(id, reps) });
const upsertSession: Op = { kind: "upsert", table: "sessions", row: session };

function memoryKv(): Kv & { data: Partial<KvSchema> } {
  const data: Partial<KvSchema> = {};
  return {
    data,
    get: async (key) => structuredClone(data[key]),
    set: async (key, value) => {
      data[key] = structuredClone(value);
    },
  };
}

type FakeServer = {
  state: LogState;
  mode: "up" | "down" | "error" | "unauthorized";
  /** Only /api/sync is unreachable (the rest of the API answers). */
  syncDown: boolean;
  rejects: (op: Op) => boolean;
  /** When set, GET /api/state waits for this before answering. */
  stateGate: Promise<void> | null;
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
};

/** A fake /api backed by applyOps, which can go offline, fail, or reject specific ops. */
function fakeServer(initial: LogState = { sessions: [], setLogs: [], runs: [], blockStartDate: START }): FakeServer {
  const server: FakeServer = {
    state: initial,
    mode: "up",
    syncDown: false,
    rejects: () => false,
    stateGate: null,
    fetch: async (url, init) => {
      if (server.mode === "down") throw new TypeError("Failed to fetch");
      if (server.mode === "error") return Response.json({ error: "boom" }, { status: 500 });
      if (server.mode === "unauthorized") return Response.json({ error: "unauthorized" }, { status: 401 });
      if (url === "/api/program") return Response.json(program);
      if (url === "/api/state") {
        const snapshot = structuredClone(server.state);
        if (server.stateGate) await server.stateGate;
        return Response.json(snapshot);
      }
      if (server.syncDown) throw new TypeError("Failed to fetch");
      const { ops }: { ops: Op[] } = JSON.parse(String(init?.body));
      for (let i = 0; i < ops.length; i++) {
        if (server.rejects(ops[i])) return Response.json({ applied: i, error: "invalid" }, { status: 422 });
        server.state = applyOps(server.state, [ops[i]]);
      }
      return Response.json({ applied: ops.length });
    },
  };
  return server;
}

function setup(server = fakeServer(), kv = memoryKv()) {
  const retries: (() => void)[] = [];
  let unauthorized = 0;
  const store = new SyncStore({
    kv,
    fetch: server.fetch,
    schedule: (fn) => retries.push(fn),
    today: () => TODAY,
    onUnauthorized: () => unauthorized++,
  });
  const runRetries = async () => {
    retries.splice(0).forEach((fn) => fn());
    await store.idle();
  };
  return { store, server, kv, retries, runRetries, unauthorized: () => unauthorized };
}

describe("SyncStore: writes", () => {
  it("applies a write to local state immediately, before any network", () => {
    const { store, server } = setup();
    server.mode = "down";
    store.apply([upsertSession, upsertSet("x")]);
    expect(store.getSnapshot().log.setLogs).toEqual([set("x")]);
    expect(store.getSnapshot().pending).toBe(2);
  });

  it("sends writes to the server in the background", async () => {
    const { store, server } = setup();
    store.apply([upsertSession, upsertSet("x")]);
    await store.idle();
    expect(server.state.setLogs).toEqual([set("x")]);
    expect(store.getSnapshot().pending).toBe(0);
  });

  it("offline: keeps writes queued and retries until the network is back", async () => {
    const { store, server, retries, runRetries } = setup();
    server.mode = "down";
    store.apply([upsertSession, upsertSet("x")]);
    await store.idle();
    expect(store.getSnapshot().pending).toBe(2);
    expect(retries).toHaveLength(1);

    await runRetries(); // still down
    expect(store.getSnapshot().pending).toBe(2);

    server.mode = "up";
    await runRetries();
    expect(server.state.setLogs).toEqual([set("x")]);
    expect(store.getSnapshot().pending).toBe(0);
  });

  it("server error (500): keeps writes queued and retries", async () => {
    const { store, server, retries, runRetries } = setup();
    server.mode = "error";
    store.apply([upsertSession]);
    await store.idle();
    expect(retries).toHaveLength(1);
    server.mode = "up";
    await runRetries();
    expect(server.state.sessions).toEqual([session]);
  });

  it("an op the server can never accept (422) is dropped; the others still sync", async () => {
    const { store, server } = setup();
    server.rejects = (op) => op.kind === "upsert" && op.row.id === "bad";
    store.apply([upsertSession, upsertSet("bad"), upsertSet("good")]);
    await store.idle();
    expect(server.state.setLogs).toEqual([set("good")]);
    expect(store.getSnapshot().pending).toBe(0);
  });

  it("an undo while offline syncs as a delete", async () => {
    const { store, server, runRetries } = setup();
    server.mode = "down";
    store.apply([upsertSession, upsertSet("x")]);
    store.apply([{ kind: "delete", table: "set_logs", id: "x" }]);
    server.mode = "up";
    await runRetries();
    expect(server.state.sessions).toEqual([session]);
    expect(server.state.setLogs).toEqual([]);
  });
});

describe("SyncStore: block week", () => {
  it("a week change made offline is kept locally and synced later", async () => {
    const { store, server, runRetries } = setup();
    server.mode = "down";
    store.apply([{ kind: "set_block_start", date: "2026-09-14" }]);
    expect(store.getSnapshot().log.blockStartDate).toBe("2026-09-14");
    server.mode = "up";
    await runRetries();
    expect(server.state.blockStartDate).toBe("2026-09-14");
  });
});

describe("SyncStore: persistence and reload", () => {
  it("a reopened app shows logged sets and still has the unsent queue, with no network", async () => {
    const kv = memoryKv();
    const first = setup(fakeServer(), kv);
    await first.store.start();
    first.server.mode = "down";
    first.store.apply([upsertSession, upsertSet("x")]);
    await first.store.idle();

    const offline = fakeServer();
    offline.mode = "down";
    const second = setup(offline, kv);
    await second.store.start();
    await second.store.idle();
    expect(second.store.getSnapshot().ready).toBe(true);
    expect(second.store.getSnapshot().log.setLogs).toEqual([set("x")]);
    expect(second.store.getSnapshot().pending).toBe(2);

    offline.mode = "up";
    await second.runRetries();
    expect(offline.state.setLogs).toEqual([set("x")]);
  });

  it("first ever load needs the network", async () => {
    const offline = fakeServer();
    offline.mode = "down";
    const { store } = setup(offline);
    await store.start();
    expect(store.getSnapshot().ready).toBe(false);
  });
});

describe("SyncStore: pull and reconcile", () => {
  it("merges server state with writes that have not synced yet", async () => {
    const kv = memoryKv();
    kv.data.program = program;
    kv.data.log = { sessions: [session], setLogs: [set("x")], runs: [], blockStartDate: START };
    kv.data.outbox = [upsertSet("x")];
    const run: Run = { id: "r1", date: TODAY, kind: "easy", distance_km: 5, duration_sec: 1500, effort: null, notes: null };
    const server = fakeServer({ sessions: [session], setLogs: [], runs: [run], blockStartDate: START });
    server.syncDown = true; // the pull works, the queued set can't be sent yet
    const { store } = setup(server, kv);

    await store.start();

    expect(store.getSnapshot().log.runs).toEqual([run]);
    expect(store.getSnapshot().log.setLogs).toEqual([set("x")]);
    expect(store.getSnapshot().pending).toBe(1);
  });

  it("a set logged while a pull is in flight is not lost", async () => {
    const { store, server } = setup(fakeServer({ sessions: [session], setLogs: [], runs: [], blockStartDate: START }));
    let release = () => {};
    server.stateGate = new Promise((r) => (release = r));
    const started = store.start();
    await Promise.resolve();
    store.apply([upsertSet("x")]);
    release();
    await started;
    await store.idle();
    expect(store.getSnapshot().log.setLogs).toEqual([set("x")]);
    expect(server.state.setLogs).toEqual([set("x")]);
  });

  it("closes sessions left open on an earlier day after loading", async () => {
    const old: Session = { ...session, id: "old", date: "2026-10-21" };
    const { store, server } = setup(fakeServer({ sessions: [old], setLogs: [{ ...set("y"), session_id: "old", done_at: "2026-10-21T19:00:00Z" }], runs: [], blockStartDate: START }));
    await store.start();
    await store.idle();
    expect(server.state.sessions[0].completed_at).toBe("2026-10-21T19:00:00Z");
  });

  it("an expired login on load sends the user to the login page", async () => {
    const server = fakeServer();
    server.mode = "unauthorized";
    const { store, unauthorized } = setup(server);
    await store.start();
    expect(unauthorized()).toBe(1);
  });
});

describe("SyncStore: subscribers", () => {
  it("notifies on change with a new snapshot object", () => {
    const { store } = setup();
    const before = store.getSnapshot();
    let calls = 0;
    store.subscribe(() => calls++);
    store.apply([upsertSession]);
    expect(calls).toBeGreaterThan(0);
    expect(store.getSnapshot()).not.toBe(before);
  });
});
