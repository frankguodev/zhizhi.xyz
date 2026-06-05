import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_SC } from "next/font/google";
import { CookieNotice } from "@/components/layout/cookie-notice";
import { ThemeScript } from "@/components/layout/theme-script";
import { defaultShareImage, siteConfig } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.nameEn}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.nameEn, url: siteConfig.url }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: `${siteConfig.name} | ${siteConfig.nameEn}`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    locale: "zh_CN",
    type: "website",
    images: [defaultShareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | ${siteConfig.nameEn}`,
    description: siteConfig.description,
    images: [defaultShareImage.url],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansSc.variable} h-full scroll-smooth antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full bg-background text-foreground">
        <ThemeScript />
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
