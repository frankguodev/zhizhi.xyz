import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ToolsWorkbench } from "@/components/tools/tools-workbench";

export const metadata = {
  title: "Tools",
  description: "Local utilities for JSON, encoding, time, and text conversion.",
};

export default function EnglishToolsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale="en" currentPath="/en/tools" />

      <main className="flex-1 bg-background">
        <section className="px-6 py-6 md:py-8">
          <ToolsWorkbench locale="en" />
        </section>
      </main>

      <SiteFooter locale="en" />
    </div>
  );
}
