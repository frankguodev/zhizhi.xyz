import type { ReactNode } from "react";
import { ToolsStandaloneFooter } from "./tools-standalone-footer";
import { ToolsStandaloneHeader } from "./tools-standalone-header";

export function ToolsStandaloneShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="bg-background">
      <div className="flex min-h-[100dvh] flex-col">
        <ToolsStandaloneHeader />
        <main className="flex flex-1 flex-col bg-background">
          <section className="flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-6 md:py-7">
            <h1 className="sr-only">{title}</h1>
            {children}
          </section>
        </main>
      </div>
      <ToolsStandaloneFooter />
    </div>
  );
}
