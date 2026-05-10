import Link from "next/link";
import { FolderOpen, Tag } from "lucide-react";
import type { ArticleRecord } from "@/data/articles";
import { getCategoryHref, getTagHref } from "@/lib/article-taxonomy";

type TaxonomyLinkCloudProps = {
  categories: string[];
  tags: string[];
  locale?: ArticleRecord["locale"];
};

export function TaxonomyLinkCloud({ categories, tags, locale = "zh" }: TaxonomyLinkCloudProps) {
  const categoryLabel = locale === "en" ? "Categories" : "分类";
  const tagLabel = locale === "en" ? "Tags" : "标签";

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <section className="index-surface rounded-md border border-line p-5 md:pl-10">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FolderOpen className="h-4 w-4 text-accent" />
          {categoryLabel}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category}
              className="inline-flex min-h-9 items-center rounded-md border border-line bg-paper px-3 text-sm font-semibold text-muted transition hover:border-accent/50 hover:text-foreground"
              href={getCategoryHref(category, locale)}
            >
              {category}
            </Link>
          ))}
        </div>
      </section>
      <section className="index-surface rounded-md border border-line p-5 md:pl-10">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Tag className="h-4 w-4 text-accent" />
          {tagLabel}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag}
              className="inline-flex min-h-9 items-center rounded-md border border-line bg-paper px-3 text-sm font-semibold text-muted transition hover:border-accent/50 hover:text-foreground"
              href={getTagHref(tag, locale)}
            >
              {tag}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
