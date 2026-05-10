"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FavoriteButtonProps = {
  slug: string;
  locale?: "zh" | "en";
  initialFavorited: boolean;
};

export function FavoriteButton({ slug, locale = "zh", initialFavorited }: FavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleFavorite() {
    const nextFavorited = !favorited;
    setLoading(true);
    setMessage("");

    const response = await fetch(`/api/articles/${slug}/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorited: nextFavorited, locale }),
    });

    const payload = (await response.json().catch(() => null)) as { favorited?: boolean; error?: string } | null;

    if (!response.ok || typeof payload?.favorited !== "boolean") {
      setMessage(payload?.error ?? "收藏操作失败，请稍后再试。");
      setLoading(false);
      return;
    }

    setFavorited(payload.favorited);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-paper px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent disabled:opacity-60"
        onClick={toggleFavorite}
        disabled={loading}
        aria-pressed={favorited}
      >
        <Bookmark className={favorited ? "h-4 w-4 fill-current text-accent" : "h-4 w-4 text-accent"} />
        {favorited ? "已收藏" : "收藏文章"}
      </button>
      {message ? <p className="max-w-sm text-sm text-muted">{message}</p> : null}
    </div>
  );
}
