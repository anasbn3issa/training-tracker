import { DataProvider } from "@/components/data-provider";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <DataProvider>{children}</DataProvider>;
}
