import { DataProvider } from "@/components/data-provider";
import { ProgramGate } from "@/components/program-gate";
import { ServiceWorkerRegister } from "@/components/sw-register";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <DataProvider>
      <ServiceWorkerRegister />
      <ProgramGate>{children}</ProgramGate>
    </DataProvider>
  );
}
