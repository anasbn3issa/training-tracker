import { DataProvider } from "@/components/data-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <DataProvider>
      <ServiceWorkerRegister />
      {children}
    </DataProvider>
  );
}
