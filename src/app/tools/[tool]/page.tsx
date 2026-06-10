import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolsPageShell } from "@/components/tools/tools-page-shell";
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
    <ToolsPageShell title={route.title}>
      <ToolsWorkbench initialTool={route.id} />
    </ToolsPageShell>
  );
}
