"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useData } from "@/components/data-provider";
import { ChooseProgram } from "@/components/program/choose-program";
import { Loading } from "@/components/ui";
import { currentUserName } from "@/lib/user-cookie";

/** First login: choose a program and a week. */
export default function OnboardingPage() {
  const { program, ready } = useData();
  const router = useRouter();
  const hasProgram = program?.active != null;

  useEffect(() => {
    if (hasProgram) router.replace("/");
  }, [hasProgram, router]);

  if (!ready || !program || hasProgram) return <Loading />;
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <p className="text-[15px] text-fg-2">Welcome, {currentUserName()}</p>
      <ChooseProgram switching={false} onDone={() => router.replace("/")} />
    </main>
  );
}
