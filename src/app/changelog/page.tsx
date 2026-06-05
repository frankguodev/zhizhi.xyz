import type { Metadata } from "next";
import { ChangelogPage } from "@/components/content/changelog-page";
import { defaultShareImage, siteConfig } from "@/lib/site";

const title = "更新日志";
const description = "记录知之每一次上线带来的新增、优化与修复。";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/changelog",
  },
  openGraph: {
    title,
    description,
    url: `${siteConfig.url}/changelog`,
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    type: "website",
    locale: "zh_CN",
    images: [defaultShareImage],
  },
};

export default function ChangelogRoute() {
  return <ChangelogPage />;
}
