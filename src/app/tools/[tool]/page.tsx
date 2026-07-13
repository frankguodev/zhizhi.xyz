import { permanentRedirect } from "next/navigation";

type ToolRouteProps = {
  params: Promise<{ tool: string }>;
};

export async function generateMetadata({ params }: ToolRouteProps) {
  const { tool } = await params;
  const url = `https://tooldb.cn/${encodeURIComponent(tool)}`;

  return {
    title: "在线工具台迁移中",
    description: "知之在线工具台已迁移到 ToolDB 独立站点。",
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: "在线工具台迁移中",
      description: "知之在线工具台已迁移到 ToolDB 独立站点。",
      url,
      type: "website",
    },
  };
}

export default async function ToolRoutePage({ params }: ToolRouteProps) {
  const { tool } = await params;
  permanentRedirect(`https://tooldb.cn/${encodeURIComponent(tool)}`);
}
