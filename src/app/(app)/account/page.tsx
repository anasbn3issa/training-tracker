"use client";

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/components/data-provider";
import { DeleteButton } from "@/components/delete-button";
import { BackLink, Loading, ScreenTitle, SectionHead, eyebrow } from "@/components/ui";
import { CLEAR_CACHE_KEY, deleteAccount } from "@/lib/account-api";
import { useOnline } from "@/lib/use-online";
import { currentUserId, currentUserName } from "@/lib/user-cookie";

/** Who is signed in, what the app keeps, and deleting the account with all its data. */
export default function AccountPage() {
  const { ready } = useData();
  const online = useOnline();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The name comes from a cookie: read it on the client only.
  if (!ready) return <Loading />;

  async function remove() {
    // The login page clears this user's offline copy (here the open cache would block it). Written before
    // deleting: the response clears the cookie holding the id, and a background sync answered 401 may
    // send the page to /login before the call returns.
    const userId = currentUserId();
    const remember = (id: string | null) => {
      try {
        if (id) sessionStorage.setItem(CLEAR_CACHE_KEY, id);
        else sessionStorage.removeItem(CLEAR_CACHE_KEY);
      } catch {
        // Storage blocked: the offline copy stays, the account itself is still deleted on the server.
      }
    };
    setDeleting(true);
    setError(null);
    remember(userId);
    try {
      await deleteAccount();
      window.location.replace("/login?deleted=1");
    } catch (e) {
      remember(null); // still signed in: the login page must not wipe this cache
      setError(e instanceof Error ? e.message : "Couldn't delete your account. Try again.");
      setDeleting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <BackLink href="/program">Your program</BackLink>
      <div>
        <p className={eyebrow}>Signed in as</p>
        <ScreenTitle>{currentUserName()}</ScreenTitle>
      </div>

      <section className="flex flex-col gap-2">
        <SectionHead title="Your data" />
        <p className="text-[15px] text-fg-2">
          Your name and email from Google, your program, workouts and runs. Nothing is shared or sold, and there are no ads or trackers.
        </p>
        <Link href="/privacy" className="type-label flex h-12 items-center self-start text-sm text-accent">
          Privacy page
        </Link>
      </section>

      <section className="mt-auto flex flex-col gap-2">
        <SectionHead title="Delete account" />
        <p className="text-[15px] text-fg-2">
          Deletes your account, workouts, runs and programs, on the server and on this phone. You can&apos;t undo it.
        </p>
        {!online && (
          <p role="status" className="text-[15px] font-semibold">
            You&apos;re offline. Deleting your account needs a connection.
          </p>
        )}
        {error && (
          <p role="alert" className="text-[15px] text-danger">
            {error}
          </p>
        )}
        <DeleteButton
          label={deleting ? "Deleting…" : "Delete my account"}
          armedLabel="Tap again to delete everything"
          onConfirm={remove}
          disabled={!online || deleting}
        />
      </section>
    </main>
  );
}
