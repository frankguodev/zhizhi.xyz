import Link from "next/link";
import { Languages } from "lucide-react";
import { alternateLocalePath } from "@/lib/i18n";
import type { Locale } from "@/lib/site";
import { t } from "@/lib/translations";

type LanguageSwitcherProps = {
  locale: Locale;
  currentPath: string;
};

export function LanguageSwitcher({ locale, currentPath }: LanguageSwitcherProps) {
  const href = alternateLocalePath(locale, currentPath);

  return (
    <Link
      className="icon-action inline-flex h-9 w-9 items-center justify-center rounded-md text-muted"
      href={href}
      aria-label={t(locale, "language.switch")}
      title={t(locale, "language.switch")}
    >
      <Languages className="h-4 w-4" />
    </Link>
  );
}
