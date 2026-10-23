"use client";

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { applyOps } from "@/lib/ops";
import { localIsoDate, staleSessionOps } from "@/lib/today";
import type { LogState, Op, Program } from "@/lib/types";

type Data = {
  program: Program | null;
  log: LogState;
  ready: boolean;
  /** Applies writes to local state immediately, then sends them to the server. */
  apply: (ops: Op[]) => void;
};

const DataContext = createContext<Data | null>(null);

const emptyLog: LogState = { sessions: [], setLogs: [], runs: [] };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 401) {
    window.location.replace("/login");
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

// Step 5 replaces this with a persistent outbox (IndexedDB) and retry.
function send(ops: Op[]) {
  fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ops }) }).catch(
    (e) => console.error("sync failed", e),
  );
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [program, setProgram] = useState<Program | null>(null);
  const [log, setLog] = useState<LogState>(emptyLog);
  const [ready, setReady] = useState(false);

  const apply = useCallback((ops: Op[]) => {
    if (ops.length === 0) return;
    setLog((s) => applyOps(s, ops));
    send(ops);
  }, []);

  useEffect(() => {
    Promise.all([getJson<Program>("/api/program"), getJson<LogState>("/api/state")])
      .then(([p, l]) => {
        setProgram(p);
        setLog(l);
        setReady(true);
        apply(staleSessionOps(l.sessions, l.setLogs, localIsoDate(new Date())));
      })
      .catch((e) => console.error("load failed", e));
  }, [apply]);

  return <DataContext value={{ program, log, ready, apply }}>{children}</DataContext>;
}

export function useData(): Data {
  const data = use(DataContext);
  if (!data) throw new Error("useData must be used inside <DataProvider>");
  return data;
}
