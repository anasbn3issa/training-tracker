"use client";

import { useState } from "react";
import { useData } from "@/components/data-provider";
import { ChevronDownIcon } from "@/components/icons";
import { DayBadge, Loading, RunBadge, ScreenTitle, card } from "@/components/ui";
import { formatDuration, formatPace, historyItems, type HistoryItem } from "@/lib/history";
import { formatSets } from "@/lib/session";

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const KIND_LABEL = { easy: "Easy run", long: "Long run", intervals: "Intervals", race: "Race" };

export default function HistoryPage() {
  const { program, log, ready } = useData();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!ready || !program) return <Loading />;
  const items = historyItems(log, program);

  return (
    <main className="flex flex-col gap-3 px-4 pt-5 pb-4">
      <ScreenTitle>History</ScreenTitle>
      {items.length === 0 && <p className="text-fg-2">Nothing logged yet.</p>}
      <ul className="flex flex-col gap-2.5">
        {items.map((item) =>
          item.kind === "session" ? (
            <SessionRow
              key={item.session.id}
              item={item}
              open={openId === item.session.id}
              onToggle={() => setOpenId(openId === item.session.id ? null : item.session.id)}
            />
          ) : (
            <li key={item.run.id} className={`${card} p-3.5`}>
              <div className="flex items-center gap-3">
                <RunBadge />
                <div className="min-w-0">
                  <p className="text-[17px] font-bold tabular-nums">
                    {item.run.distance_km} km · {formatDuration(item.run.duration_sec)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-fg-3">
                    {formatDate(item.date)} · {KIND_LABEL[item.run.kind]} ·{" "}
                    <span className="tabular-nums">{formatPace(item.run.distance_km, item.run.duration_sec)}</span>
                    {item.run.effort !== null && ` · effort ${item.run.effort}`}
                  </p>
                </div>
              </div>
              {item.run.notes && <p className="mt-2 pl-[52px] text-[15px] text-fg-2">{item.run.notes}</p>}
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
    <li className={card}>
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 p-3.5 text-left">
        <DayBadge code={item.session.day_code} />
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold">{item.dayName}</span>
          <span className="mt-0.5 block text-[13px] text-fg-3">
            {formatDate(item.date)} · week {item.session.block_week} · {setCount} sets
            {item.session.completed_at === null && <span className="text-accent"> · in progress</span>}
          </span>
        </span>
        <ChevronDownIcon className={`size-5 text-fg-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <dl className="flex flex-col gap-2.5 pr-3.5 pb-3.5 pl-[66px]">
          {item.exercises.length === 0 && <p className="text-fg-3">No sets logged.</p>}
          {item.exercises.map((e) => (
            <div key={e.id}>
              <dt className="text-[13px] text-fg-3">{e.name}</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{formatSets(e.sets, e.loadType)}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
