import type { Metadata } from "next";
import { HomePage } from "@/components/content/home-page";
import { getPublicHomePayload } from "@/lib/public-home";
import { siteConfig } from "@/lib/site";

const description = "分享普通人也能复制的实战经验和真实成长路径。";

export const metadata: Metadata = {
  title: siteConfig.name,
  description,
  alternates: {
    canonical: "/",
    languages: {
      "zh-CN": "/",
      en: "/en",
    },
  },
  openGraph: {
    title: siteConfig.name,
    description,
    url: "/",
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteConfig.name,
    description,
  },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const payload = await getPublicHomePayload("zh");

  return <HomePage payload={payload} />;
}
