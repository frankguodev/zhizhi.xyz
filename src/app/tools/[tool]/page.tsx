import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ToolsWorkbench } from "@/components/tools/tools-workbench";
import { findToolRouteBySlug, toolRoutes } from "@/lib/tools-meta";

export const dynamicParams = false;

type ToolRouteProps = {
  params: Promise<{ tool: string }>;
};

export function generateStaticParams() {
  return toolRoutes.map((route) => ({ tool: route.slug }));
}

export async function generateMetadata({ params }: ToolRouteProps): Promise<Metadata> {
  const { tool } = await params;
  const route = findToolRouteBySlug(tool);

  if (!route) {
    return {};
  }

  const url = `/tools/${route.slug}`;

  return {
    title: route.title,
    description: route.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: route.title,
      description: route.description,
      url,
      type: "website",
    },
  };
}

export default async function ToolRoutePage({ params }: ToolRouteProps) {
  const { tool } = await params;
  const route = findToolRouteBySlug(tool);

  if (!route) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader currentPath="/tools" />

      <main className="flex-1 bg-background">
        <section className="px-6 py-6 md:py-8">
          <h1 className="sr-only">{route.title}</h1>
          <ToolsWorkbench initialTool={route.id} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
