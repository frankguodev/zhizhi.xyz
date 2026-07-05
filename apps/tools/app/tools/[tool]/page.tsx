import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolsStandaloneShell } from "@/components/tools-standalone/tools-standalone-shell";
import { findToolRouteBySlug, toolRoutes } from "@/lib/tools-meta";
import { ToolsWorkbenchClient } from "../../../components/tools-workbench-client";

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

  return {
    title: route.title,
    description: route.description,
    alternates: {
      canonical: `/tools/${route.slug}`,
    },
    openGraph: {
      title: route.title,
      description: route.description,
      url: `/tools/${route.slug}`,
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
    <ToolsStandaloneShell title={route.title}>
      <ToolsWorkbenchClient initialTool={route.id} />
    </ToolsStandaloneShell>
  );
}
