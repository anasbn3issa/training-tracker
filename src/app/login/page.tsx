import { Suspense } from "react";

// Only the error line reads the URL, so the rest of the page is prerendered.
async function SignInError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  return error ? <p className="text-sm font-medium text-danger">Sign-in failed, please try again</p> : null;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 flex-col justify-end gap-6 px-4 pb-12">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon, served without auth */}
        <img src="/icons/icon-192.png" alt="" width={64} height={64} className="rounded-2xl" />
        <h1 className="mt-4 text-[32px] font-extrabold tracking-tight">Training Tracker</h1>
        <p className="text-fg-2">Sign in to log your training.</p>
      </div>
      <div className="flex flex-col gap-3">
        <Suspense>
          <SignInError searchParams={searchParams} />
        </Suspense>
        {/* A full page load, not client navigation: the route redirects to Google. */}
        <a
          href="/api/auth/google"
          className="flex min-h-16 touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-accent px-4 text-xl font-bold text-on-accent active:bg-accent-press"
        >
          Continue with Google
        </a>
      </div>
    </main>
  );
}
