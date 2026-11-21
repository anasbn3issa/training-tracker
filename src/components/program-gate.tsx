"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useData } from "./data-provider";
import { Loading } from "./ui";

// Reachable without a program: deleting an account must not require choosing one first.
const NO_PROGRAM_NEEDED = ["/onboarding", "/account"];

/** A user without a program (first login) goes to onboarding before anything else. */
export function ProgramGate({ children }: { children: ReactNode }) {
  const { program } = useData();
  const pathname = usePathname();
  const router = useRouter();
  const needsProgram = program !== null && program.active === null && !NO_PROGRAM_NEEDED.includes(pathname);

  useEffect(() => {
    if (needsProgram) router.replace("/onboarding");
  }, [needsProgram, router]);

  return needsProgram ? <Loading /> : children;
}
