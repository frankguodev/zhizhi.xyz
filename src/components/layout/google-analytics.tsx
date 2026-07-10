"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

const googleAnalyticsId = "G-VSQYMEZ93W";
const excludedPathPrefixes = ["/admin", "/login", "/register", "/me"];

export function GoogleAnalytics() {
  const pathname = usePathname();

  if (excludedPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  return (
    <>
      <Script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} />
      <Script id="google-analytics">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${googleAnalyticsId}');
        `}
      </Script>
    </>
  );
}
