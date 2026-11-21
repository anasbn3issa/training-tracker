import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ScreenTitle, SectionHead, eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy · Training Tracker" };

// Public (see the proxy matcher): Google's consent screen and signed-out people link here.
// The contact comes from the environment so no personal address lives in the repo.
const CONTACT = process.env.PRIVACY_CONTACT;

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionHead title={title} />
      <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-fg-2">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pt-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div>
        <p className={eyebrow}>Last updated 21 November 2026</p>
        <ScreenTitle>Privacy</ScreenTitle>
        <p className="mt-2 text-fg-2">Training Tracker is a small app to log lifting and runs. Here is what it keeps about you, and why.</p>
      </div>

      <Part title="What we keep">
        <p>From your Google account: your name, your email address and your Google account ID, to recognise you when you sign in.</p>
        <p>What you log: your program and week, your workouts and sets, your runs, and your notes.</p>
        <p>On your phone: an offline copy of that data, so the app works without signal.</p>
      </Part>

      <Part title="Why">
        <p>
          Only to run the app: show your history, suggest your next weights and keep your phones in sync. There are no ads, no analytics and
          no trackers. Your data is never sold or shared.
        </p>
      </Part>

      <Part title="Where">
        <p>The data is stored with Supabase (database) and the app is hosted by Vercel. They process it only to provide those services.</p>
      </Part>

      <Part title="Cookies">
        <p>Only the ones needed to keep you signed in and to complete Google sign-in. No tracking cookies.</p>
      </Part>

      <Part title="Your data, your call">
        <p>
          Keep it as long as you use the app. Delete your account at any time from Account, at the bottom of your program page: your account
          and everything you logged are deleted at once, on the server and on that phone. This can&apos;t be undone.
        </p>
        <p>
          For a copy of your data, a correction, or any question:{" "}
          {CONTACT ? (
            <a href={`mailto:${CONTACT}`} className="font-semibold text-fg underline underline-offset-2">
              {CONTACT}
            </a>
          ) : (
            "contact the person who runs this app."
          )}
        </p>
      </Part>

      <Link href="/" className="type-label flex h-12 items-center self-start text-sm text-accent">
        Back to the app
      </Link>
    </main>
  );
}
