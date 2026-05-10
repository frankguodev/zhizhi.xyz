import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ToolsWorkbench } from "@/components/tools/tools-workbench";

export const metadata = {
  title: "工具",
  description: "知之的本地工具台，提供 JSON、编码、时间和文本等常用转换工具。",
};

export default function ToolsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader currentPath="/tools" />

      <main className="flex-1 bg-background">
        <section className="px-6 py-6 md:py-8">
          <ToolsWorkbench />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
