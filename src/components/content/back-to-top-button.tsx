"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    function update() {
      setVisible(window.scrollY > 320);
    }

    frame = window.requestAnimationFrame(() => {
      setVisible(window.scrollY > 320);
    });
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      className="article-back-to-top"
      aria-label="返回顶部"
      title="返回顶部"
      data-visible={visible ? "true" : "false"}
      onClick={scrollToTop}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
