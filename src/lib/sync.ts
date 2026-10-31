import { applyOps } from "./ops";
import { staleSessionOps } from "./today";
import type { LogState, Op, Program } from "./types";

// Offline-first store. Every write lands in local state and IndexedDB first,
// then an outbox of ops is sent to /api/sync in the background with retry.
// The UI only ever reads local state, so it never waits on the network.

export type KvSchema = { program: Program; log: LogState; outbox: Op[] };

export type Kv = {
  get<K extends keyof KvSchema>(key: K): Promise<KvSchema[K] | undefined>;
  set<K extends keyof KvSchema>(key: K, value: KvSchema[K]): Promise<void>;
};

type Deps = {
  kv: Kv;
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  schedule: (fn: () => void, ms: number) => void;
  /** The device's local date, for closing stale sessions. */
  today: () => string;
  onUnauthorized: () => void;
};

export type Snapshot = {
  program: Program | null;
  log: LogState;
  /** Ops written locally but not yet accepted by the server. */
  pending: number;
  /** False until there is something to show (cache or first successful pull). */
  ready: boolean;
};

const BATCH = 100;
const FIRST_RETRY_MS = 2_000;
const MAX_RETRY_MS = 30_000;

export class SyncStore {
  private snapshot: Snapshot = { program: null, log: { sessions: [], setLogs: [], runs: [], blockStartDate: "" }, pending: 0, ready: false };
  // Treated as immutable: always replaced, never mutated, so a value handed to
  // IndexedDB can't change under it.
  private outbox: Op[] = [];
  private listeners = new Set<() => void>();
  // Pulls and flushes run one at a time, in order. A pull must never see the
  // server mid-flush, or an op acked during the pull would vanish locally.
  private queue: Promise<void> = Promise.resolve();
  private flushQueued = false;
  private retryScheduled = false;
  private failures = 0;
  private started = false;

  constructor(private deps: Deps) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  apply = (ops: Op[]) => {
    if (ops.length === 0) return;
    this.outbox = [...this.outbox, ...ops];
    this.update({ log: applyOps(this.snapshot.log, ops) });
    this.persist();
    this.sync();
  };

  /** Try to send the outbox now (on load, when back online, when the app returns to the foreground). */
  sync = () => {
    if (this.flushQueued) return;
    this.flushQueued = true;
    void this.exclusive(async () => {
      this.flushQueued = false;
      await this.flush();
    });
  };

  async start() {
    if (this.started) return;
    this.started = true;

    const [program, log, outbox] = await Promise.all([this.deps.kv.get("program"), this.deps.kv.get("log"), this.deps.kv.get("outbox")]);
    const early = this.outbox; // anything applied while the cache was loading
    this.outbox = [...(outbox ?? []), ...early];
    if (program && log) this.update({ program, log: applyOps(log, early), ready: true });
    else this.update({});

    await this.exclusive(() => this.pull());
    if (this.snapshot.ready) {
      const { sessions, setLogs } = this.snapshot.log;
      this.apply(staleSessionOps(sessions, setLogs, this.deps.today()));
    }
    this.sync();
  }

  /** Resolves once no pull or flush is running or queued. */
  async idle() {
    let current: Promise<void>;
    do {
      current = this.queue;
      await current;
    } while (current !== this.queue);
  }

  private update(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch, pending: this.outbox.length };
    this.listeners.forEach((l) => l());
  }

  private persist() {
    void this.deps.kv.set("outbox", this.outbox);
    void this.deps.kv.set("log", this.snapshot.log);
  }

  private exclusive(task: () => Promise<void>) {
    this.queue = this.queue.then(task).catch((e) => console.error("sync task failed", e));
    return this.queue;
  }

  /** Server state, with not-yet-synced local ops replayed on top (last write wins). */
  private async pull() {
    try {
      const [programRes, stateRes] = await Promise.all([
        this.deps.fetch("/api/program", { cache: "no-store" }),
        this.deps.fetch("/api/state", { cache: "no-store" }),
      ]);
      if (programRes.status === 401 || stateRes.status === 401) return this.deps.onUnauthorized();
      if (!programRes.ok || !stateRes.ok) return;
      const program: Program = await programRes.json();
      const server: LogState = await stateRes.json();
      this.update({ program, log: applyOps(server, this.outbox), ready: true });
      void this.deps.kv.set("program", program);
      this.persist();
    } catch {
      // Offline: keep showing the cached state.
    }
  }

  private async flush() {
    while (this.outbox.length > 0) {
      const batch = this.outbox.slice(0, BATCH);
      let res: Response;
      try {
        res = await this.deps.fetch("/api/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ops: batch }),
        });
      } catch {
        return this.retryLater();
      }
      if (res.status === 401) return this.deps.onUnauthorized();
      if (res.status !== 200 && res.status !== 422) return this.retryLater();

      const body: { applied?: unknown; error?: unknown } = await res.json().catch(() => ({}));
      const applied = typeof body.applied === "number" ? body.applied : 0;
      // 422: the op at `applied` can never succeed. Drop it so it doesn't block the rest.
      const done = res.status === 422 ? applied + 1 : applied;
      if (res.status === 422) console.warn("sync: dropped an op the server rejected", batch[applied], body.error);
      if (done === 0) return this.retryLater();

      this.outbox = this.outbox.slice(done);
      this.failures = 0;
      this.update({});
      this.persist();
    }
  }

  private retryLater() {
    if (this.retryScheduled) return;
    this.retryScheduled = true;
    const delay = Math.min(MAX_RETRY_MS, FIRST_RETRY_MS * 2 ** this.failures);
    this.failures++;
    this.deps.schedule(() => {
      this.retryScheduled = false;
      this.sync();
    }, delay);
  }
}
