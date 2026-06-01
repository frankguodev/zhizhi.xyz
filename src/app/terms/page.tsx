import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("terms");

export default function TermsPage() {
  return <LegalPage content={legalPages.terms} currentPath="/terms" />;
}
