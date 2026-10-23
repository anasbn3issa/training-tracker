"use client";

import { useState, type FormEvent } from "react";

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
    <main className="flex flex-1 flex-col justify-end gap-4 p-4 pb-12">
      <h1 className="text-3xl font-bold">Training Tracker</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          autoFocus
          required
          className="h-14 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-xl"
        />
        {error && <p className="text-red-400">Wrong password</p>}
        <button disabled={pending} className="h-16 rounded-xl bg-lime-400 text-xl font-bold text-black disabled:opacity-50">
          Enter
        </button>
      </form>
    </main>
  );
}
