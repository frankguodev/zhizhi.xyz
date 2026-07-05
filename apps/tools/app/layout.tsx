import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeScript } from "@/components/layout/theme-script";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tools.zhizhi.xyz"),
  title: {
    default: "在线工具箱",
    template: "%s | 在线工具箱",
  },
  description: "本地运行的在线工具集合，支持 JSON、图片、二维码、Token、Diff 等常用处理，数据不上传。",
  applicationName: "在线工具箱",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "在线工具箱",
    description: "本地运行的在线工具集合，数据不上传。",
    url: "https://tools.zhizhi.xyz",
    siteName: "在线工具箱",
    locale: "zh_CN",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}>
      <body suppressHydrationWarning className="min-h-full bg-background text-foreground">
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
