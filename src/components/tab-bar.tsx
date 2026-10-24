"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, HistoryIcon, RunIcon } from "./icons";

const TABS = [
  { href: "/", label: "Today", Icon: CalendarIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/run", label: "Log run", Icon: RunIcon },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-line bg-bg/90 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur">
      {TABS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold ${
            pathname === href ? "text-accent" : "text-fg-3"
          }`}
        >
          <Icon className="size-[22px]" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
