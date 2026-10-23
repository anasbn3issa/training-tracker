"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/history", label: "History" },
  { href: "/run", label: "Log run" },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-zinc-800 bg-black pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex h-16 flex-1 items-center justify-center text-lg font-semibold ${
            pathname === tab.href ? "text-lime-400" : "text-zinc-400"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
