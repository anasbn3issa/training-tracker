"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, HistoryIcon, RunIcon } from "./icons";

const TABS = [
  { href: "/", label: "Today", Icon: CalendarIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/run", label: "Run", Icon: RunIcon },
];

/** Solid bar under a chalk rule; 56px + 3px high, plus the safe area. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 flex border-t-[3px] border-fg bg-bg pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`type-label relative flex h-14 flex-1 flex-col items-center justify-center gap-1 text-xs ${active ? "text-accent" : "text-fg-2"}`}
          >
            {active && <span aria-hidden className="absolute inset-x-6 -top-[3px] h-[3px] bg-accent" />}
            <Icon className="size-[22px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
