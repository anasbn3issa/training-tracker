"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useData } from "./data-provider";
import { Loading } from "./ui";

/** A user without a program (first login) goes to onboarding before anything else. */
export function ProgramGate({ children }: { children: ReactNode }) {
  const { program } = useData();
  const pathname = usePathname();
  const router = useRouter();
  const needsProgram = program !== null && program.active === null && pathname !== "/onboarding";

  useEffect(() => {
    if (needsProgram) router.replace("/onboarding");
  }, [needsProgram, router]);

  return needsProgram ? <Loading /> : children;
}
