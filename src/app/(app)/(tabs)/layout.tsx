import { TabBar } from "@/components/tab-bar";

export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</div>
      <TabBar />
    </>
  );
}
