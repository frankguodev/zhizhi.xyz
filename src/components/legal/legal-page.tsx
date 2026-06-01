import { FileText } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { type LegalPageContent } from "@/lib/legal-pages";

type LegalPageProps = {
  content: LegalPageContent;
  currentPath: string;
};

export function LegalPage({ content, currentPath }: LegalPageProps) {
  return (
    <>
      <SiteHeader currentPath={currentPath} />

      <main className="min-h-screen bg-background">
        <section className="site-grid border-b border-line">
          <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <FileText className="h-4 w-4" />
              合规声明
            </p>
            <h1 className="mt-4 break-words text-3xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">{content.title}</h1>
            <p className="mt-5 break-words text-lg leading-8 text-muted [overflow-wrap:anywhere]">{content.description}</p>
            <p className="mt-4 text-sm font-medium text-muted">
              最后更新：{content.updatedAt}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="grid gap-5">
            {content.sections.map((section) => (
              <article key={section.title} className="node-surface rounded-md border border-line bg-paper/80 p-6">
                <h2 className="break-words text-xl font-semibold text-foreground [overflow-wrap:anywhere]">{section.title}</h2>
                <div className="mt-3 grid gap-3 text-sm leading-7 text-muted">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="break-words [overflow-wrap:anywhere]">{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
