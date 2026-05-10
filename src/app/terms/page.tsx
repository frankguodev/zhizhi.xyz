import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("zh", "terms");

export default function TermsPage() {
  return <LegalPage content={legalPages.zh.terms} currentPath="/terms" />;
}
