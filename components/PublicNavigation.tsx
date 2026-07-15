"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";
import { PublicAuthControls } from "@/components/PublicAuthControls";

type NavItem = {
  href: string;
  label: string;
  icon: BrandIconName;
};

const navItems: NavItem[] = [
  { href: "/juegos", label: "Juegos", icon: "dice" },
  { href: "/comunidad", label: "Comunidad", icon: "users" },
  { href: "/rankings", label: "Rankings", icon: "trophy" },
  { href: "/resenas", label: "Reseñas", icon: "document" }
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicDesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav className="header-nav-shell hidden min-[1120px]:flex" aria-label="Navegación principal">
      <div className="header-nav-list">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={`header-nav-link ${active ? "header-nav-link-active" : ""}`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PublicMobileMenu() {
  const panelId = "mobile-menu-panel";
  const panelTitleId = "mobile-menu-title";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("meepletavern:mobile-menu", { detail: { open } }));
    return () => {
      window.dispatchEvent(new CustomEvent("meepletavern:mobile-menu", { detail: { open: false } }));
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const menuButton = buttonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
        "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      firstFocusable?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      ).filter((element) => !element.hasAttribute("disabled"));

      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      menuButton?.focus();
    };
  }, [open]);

  return (
    <div className="min-[1120px]:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="header-action relative z-[60] min-h-11 w-11 px-0 sm:w-auto sm:px-3"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
      >
        <BrandIcon name={open ? "x" : "menu"} size={19} />
        <span className="hidden sm:inline">{open ? "Cerrar" : "Menú"}</span>
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={panelTitleId}
            className="mobile-nav-panel"
          >
            <div className="mobile-nav-panel-header">
              <div>
                <p className="mobile-nav-label">MeepleTavern</p>
                <h2 id={panelTitleId} className="mobile-nav-panel-title">Menú</h2>
              </div>
              <button
                type="button"
                className="mobile-nav-close"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
              >
                <BrandIcon name="x" size={19} />
              </button>
            </div>
            <nav aria-label="Navegación principal" className="grid gap-6">
              <section className="mobile-nav-group">
                <p className="mobile-nav-label">Explorar</p>
                <div className="mt-2 grid gap-1">
                  {navItems.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        aria-current={active ? "page" : undefined}
                        className={`mobile-nav-link ${active ? "mobile-nav-link-active" : ""}`}
                      >
                        <BrandIcon name={item.icon} size={18} />
                        <span>{item.label}</span>
                        <ChevronRight size={16} className="ml-auto opacity-40" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="mobile-nav-account">
                <p className="mobile-nav-label">Tu espacio</p>
                <div className="mt-2">
                  <PublicAuthControls profileLabel="Mi ludoteca" vertical={true} />
                </div>
              </section>
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
