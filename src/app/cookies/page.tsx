import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("cookies");

export default function CookiesPage() {
  return <LegalPage content={legalPages.cookies} currentPath="/cookies" />;
}
