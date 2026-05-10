import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("zh", "cookies");

export default function CookiesPage() {
  return <LegalPage content={legalPages.zh.cookies} currentPath="/cookies" />;
}
