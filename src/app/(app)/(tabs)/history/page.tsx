"use client";

import { useState } from "react";
import { useData } from "@/components/data-provider";
import { DeleteButton } from "@/components/delete-button";
import { ChevronDownIcon } from "@/components/icons";
import { Loading, RunBadge, ScreenTitle, SessionBadge } from "@/components/ui";
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
      {items.length === 0 && <p className="text-fg-2">Your workouts and runs show up here.</p>}
      <ul className="border-t-[3px] border-fg">
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
            <li key={item.run.id} className="border-b border-line">
              <button onClick={() => toggle(item.run.id)} aria-expanded={openId === item.run.id} className="flex min-h-16 w-full items-center gap-3 py-3 text-left active:bg-surface">
                <RunBadge />
                <span className="min-w-0 flex-1">
                  <span className="type-name block text-[17px] tabular-nums">
                    {item.run.distance_km} km · {formatDuration(item.run.duration_sec)}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-fg-2">
                    {formatDate(item.date)} · {KIND_LABEL[item.run.kind]} ·{" "}
                    <span className="tabular-nums">{formatPace(item.run.distance_km, item.run.duration_sec)}</span>
                    {item.run.effort !== null && ` · effort ${item.run.effort}`}
                  </span>
                </span>
                <Chevron open={openId === item.run.id} />
              </button>
              {(item.run.notes || openId === item.run.id) && (
                <div className="flex flex-col gap-2.5 pb-4 pl-[46px]">
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
  const custom = item.session.day_id === null;
  return (
    <li className="border-b border-line">
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 py-3 text-left active:bg-surface">
        <SessionBadge dayCode={item.dayCode} />
        <span className="min-w-0 flex-1">
          <span className="type-name block text-[17px]">{item.dayName}</span>
          <span className="mt-0.5 block text-[13px] text-fg-2">
            {formatDate(item.date)} · {custom ? "custom workout" : `week ${item.session.block_week} · ${setCount} set${setCount === 1 ? "" : "s"}`}
            {item.session.completed_at === null && <span className="text-accent"> · in progress</span>}
          </span>
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <dl className="flex flex-col gap-2.5 pb-4 pl-[46px]">
          {item.session.notes && <p className="text-[15px] whitespace-pre-line text-fg-2">{item.session.notes}</p>}
          {!custom && item.exercises.length === 0 && <p className="text-fg-2">No sets logged.</p>}
          {item.exercises.map((e) => (
            <div key={e.id}>
              <dt className="text-[13px] text-fg-2">{e.name}</dt>
              <dd className="type-name mt-0.5 text-[15px] tabular-nums">{formatSets(e.sets, e.loadType)}</dd>
            </div>
          ))}
          <DeleteButton label="Delete workout" onConfirm={onDelete} />
        </dl>
      )}
    </li>
  );
}

function Chevron({ open }: { open: boolean }) {
  return <ChevronDownIcon className={`size-5 shrink-0 text-fg-2 motion-safe:transition-transform ${open ? "rotate-180" : ""}`} />;
}
