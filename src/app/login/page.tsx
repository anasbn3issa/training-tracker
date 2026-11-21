import Link from "next/link";
import { Suspense } from "react";
import { ClearDeletedCache } from "./clear-deleted-cache";

// Only this line reads the URL, so the rest of the page is prerendered.
async function Notice({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error, deleted } = await searchParams;
  if (error) return <p className="text-sm font-medium text-danger">Sign-in failed. Try again.</p>;
  if (deleted) return <p className="text-[15px] font-semibold">Your account and everything you logged are deleted.</p>;
  return null;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 flex-col justify-end gap-6 px-4 pb-12">
      <ClearDeletedCache />
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon, served without auth */}
        <img src="/icons/icon-192.png" alt="" width={64} height={64} />
        <h1 className="type-display mt-5 text-[52px]">Training Tracker</h1>
        <p className="mt-2 text-fg-2">Sign in to log your training.</p>
      </div>
      <div className="flex flex-col gap-3">
        <Suspense>
          <Notice searchParams={searchParams} />
        </Suspense>
        {/* A full page load, not client navigation: the route redirects to Google. */}
        <a
          href="/api/auth/google"
          className="type-display flex min-h-16 touch-manipulation items-center justify-center bg-accent px-4 text-[28px] text-on-accent active:bg-accent-press"
        >
          Continue with Google
        </a>
        <Link href="/privacy" className="flex h-12 items-center justify-center text-[15px] font-medium text-fg-2">
          Privacy
        </Link>
      </div>
    </main>
  );
}
