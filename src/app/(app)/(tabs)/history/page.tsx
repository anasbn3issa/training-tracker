"use client";

import { useEffect, useState } from "react";
import { useData } from "@/components/data-provider";
import { ChevronDownIcon } from "@/components/icons";
import { DayBadge, Loading, RunBadge, ScreenTitle, card } from "@/components/ui";
import { formatDuration, formatPace, historyItems, type HistoryItem } from "@/lib/history";
import { formatSets } from "@/lib/session";

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const KIND_LABEL = { easy: "Easy run", long: "Long run", intervals: "Intervals", race: "Race" };

export default function HistoryPage() {
  const { program, log, ready, apply } = useData();
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId(openId === id ? null : id);

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
              onToggle={() => toggle(item.session.id)}
              onDelete={() => apply([{ kind: "delete", table: "sessions", id: item.session.id }])}
            />
          ) : (
            <li key={item.run.id} className={card}>
              <button onClick={() => toggle(item.run.id)} aria-expanded={openId === item.run.id} className="flex min-h-16 w-full items-center gap-3 p-3.5 text-left">
                <RunBadge />
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold tabular-nums">
                    {item.run.distance_km} km · {formatDuration(item.run.duration_sec)}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-fg-3">
                    {formatDate(item.date)} · {KIND_LABEL[item.run.kind]} ·{" "}
                    <span className="tabular-nums">{formatPace(item.run.distance_km, item.run.duration_sec)}</span>
                    {item.run.effort !== null && ` · effort ${item.run.effort}`}
                  </span>
                </span>
                <Chevron open={openId === item.run.id} />
              </button>
              {(item.run.notes || openId === item.run.id) && (
                <div className="flex flex-col gap-2.5 pr-3.5 pb-3.5 pl-[66px]">
                  {item.run.notes && <p className="text-[15px] text-fg-2">{item.run.notes}</p>}
                  {openId === item.run.id && (
                    <DeleteButton label="Delete run" onConfirm={() => apply([{ kind: "delete", table: "runs", id: item.run.id }])} />
                  )}
                </div>
              )}
            </li>
          ),
        )}
      </ul>
    </main>
  );
}

function SessionRow({
  item,
  open,
  onToggle,
  onDelete,
}: {
  item: Extract<HistoryItem, { kind: "session" }>;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
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
        <Chevron open={open} />
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
          <DeleteButton label="Delete workout" onConfirm={onDelete} />
        </dl>
      )}
    </li>
  );
}

function Chevron({ open }: { open: boolean }) {
  return <ChevronDownIcon className={`size-5 shrink-0 text-fg-3 transition-transform ${open ? "rotate-180" : ""}`} />;
}

const ARM_MS = 3000;

/** Two taps instead of a confirmation dialog: the first arms it for 3 s, the second deletes. */
function DeleteButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), ARM_MS);
    return () => clearTimeout(id);
  }, [armed]);

  return (
    <button
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={`mt-1 h-12 rounded-[14px] text-[15px] font-semibold ${armed ? "bg-danger text-white" : "border border-line text-danger active:bg-surface-2"}`}
    >
      {armed ? "Tap again to delete" : label}
    </button>
  );
}
