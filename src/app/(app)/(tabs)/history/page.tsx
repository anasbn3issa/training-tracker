"use client";

import { useState } from "react";
import { useData } from "@/components/data-provider";
import { formatDuration, formatPace, historyItems, type HistoryItem } from "@/lib/history";
import { formatSets } from "@/lib/session";

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const KIND_LABEL = { easy: "Easy run", long: "Long run", intervals: "Intervals", race: "Race" };

export default function HistoryPage() {
  const { program, log, ready } = useData();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!ready || !program) return <p className="p-4 text-zinc-500">Loading…</p>;
  const items = historyItems(log, program);

  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-3xl font-bold">History</h1>
      {items.length === 0 && <p className="text-zinc-500">Nothing logged yet.</p>}
      <ul className="flex flex-col gap-3">
        {items.map((item) =>
          item.kind === "session" ? (
            <SessionRow
              key={item.session.id}
              item={item}
              open={openId === item.session.id}
              onToggle={() => setOpenId(openId === item.session.id ? null : item.session.id)}
            />
          ) : (
            <li key={item.run.id} className="rounded-xl border-l-4 border-sky-400 bg-zinc-900 p-4">
              <p className="text-xl font-bold tabular-nums">
                {item.run.distance_km} km · {formatDuration(item.run.duration_sec)} · {formatPace(item.run.distance_km, item.run.duration_sec)}
              </p>
              <p className="text-zinc-400">
                {formatDate(item.date)} · {KIND_LABEL[item.run.kind]}
                {item.run.effort !== null && ` · effort ${item.run.effort}`}
              </p>
              {item.run.notes && <p className="mt-1 text-zinc-300">{item.run.notes}</p>}
            </li>
          ),
        )}
      </ul>
    </main>
  );
}

function SessionRow({ item, open, onToggle }: { item: Extract<HistoryItem, { kind: "session" }>; open: boolean; onToggle: () => void }) {
  const setCount = item.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <li className="rounded-xl border-l-4 border-lime-400 bg-zinc-900">
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left">
        <span>
          <span className="block text-xl font-bold">
            {item.session.day_code} · {item.dayName}
          </span>
          <span className="text-zinc-400">
            {formatDate(item.date)} · week {item.session.block_week} · {setCount} sets
            {item.session.completed_at === null && <span className="text-amber-300"> · in progress</span>}
          </span>
        </span>
        <span className="text-2xl text-zinc-500">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <dl className="flex flex-col gap-2 px-4 pb-4">
          {item.exercises.length === 0 && <p className="text-zinc-500">No sets logged.</p>}
          {item.exercises.map((e) => (
            <div key={e.id}>
              <dt className="text-zinc-400">{e.name}</dt>
              <dd className="text-lg tabular-nums">{formatSets(e.sets, e.loadType)}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
