"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type SiteMobileMenuItem = {
  href: string;
  label: string;
  active: boolean;
};

type SiteMobileMenuProps = {
  menuLabel: string;
  navLabel: string;
  closeLabel: string;
  items: SiteMobileMenuItem[];
};

export function SiteMobileMenu({ menuLabel, navLabel, closeLabel, items }: SiteMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const drawer = (
    <div className={`fixed inset-x-0 bottom-0 top-16 z-40 overflow-hidden md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <button
        className={`absolute inset-0 cursor-default bg-accent/8 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        type="button"
        aria-label={closeLabel}
        onClick={() => setOpen(false)}
        tabIndex={open ? 0 : -1}
      />
      <div id={menuId} className="relative" role="dialog" aria-modal="true" aria-label={navLabel}>
        <div
          className={`glass-surface w-full rounded-b-xl border-b border-line bg-background/95 p-3 shadow-[0_18px_60px_rgba(20,17,10,0.18)] transition duration-200 ease-out ${
            open ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          }`}
        >
          <nav className="grid gap-2" aria-label={navLabel}>
            {items.map((item) => (
              <Link key={item.href} className={mobileMenuLinkClass(item.active)} href={item.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="icon-action inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:text-foreground"
        aria-label={menuLabel}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {mounted ? createPortal(drawer, document.body) : null}
    </div>
  );
}

function subscribeToHydration() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function mobileMenuLinkClass(active: boolean) {
  if (active) {
    return "block rounded-lg border border-accent/35 bg-accent/12 px-4 py-3 text-base font-semibold text-accent shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]";
  }

  return "block rounded-lg border border-line/70 bg-surface/55 px-4 py-3 text-base font-semibold text-foreground transition hover:border-accent/25 hover:bg-accent/8 hover:text-accent";
}
