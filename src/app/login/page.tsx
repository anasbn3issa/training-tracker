"use client";

import { useState, type FormEvent } from "react";
import { PrimaryButton } from "@/components/ui";

export default function LoginPage() {
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const res = await fetch("/api/login", { method: "POST", body: new FormData(event.currentTarget) });
    if (res.ok) {
      window.location.replace("/");
      return;
    }
    setError(true);
    setPending(false);
  }

  return (
    <main className="flex flex-1 flex-col justify-end gap-6 px-4 pb-12">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon, served without auth */}
        <img src="/icons/icon-192.png" alt="" width={64} height={64} className="rounded-2xl" />
        <h1 className="mt-4 text-[32px] font-extrabold tracking-tight">Training Tracker</h1>
        <p className="text-fg-2">Enter your password to continue.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Password"
          autoFocus
          required
          className="h-14 rounded-2xl border border-line bg-surface px-4 text-lg outline-none placeholder:text-fg-3 focus:border-accent"
        />
        {error && <p className="text-sm font-medium text-red-400">Wrong password</p>}
        <PrimaryButton disabled={pending}>Enter</PrimaryButton>
      </form>
    </main>
  );
}
