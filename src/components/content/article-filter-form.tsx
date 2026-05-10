"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";

type ArticleFilterFormProps = {
  action: string;
  className: string;
  children: ReactNode;
};

export function ArticleFilterForm({ action, className, children }: ArticleFilterFormProps) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    const formData = new FormData(event.currentTarget);

    for (const [key, value] of formData.entries()) {
      const stringValue = String(value).trim();
      if (key === "sort" && stringValue === "popular") {
        continue;
      }

      if (stringValue) {
        params.set(key, stringValue);
      }
    }

    const queryString = params.toString();
    router.push(queryString ? `${action}?${queryString}` : action, { scroll: false });
  }

  return (
    <form action={action} className={className} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
