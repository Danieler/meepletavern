"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";
import { PublicAuthControls } from "@/components/PublicAuthControls";

type NavTone = "primary" | "secondary" | "tertiary";

type NavItem = {
  href: string;
  label: string;
  icon: BrandIconName;
};

type NavGroup = {
  label: string;
  tone: NavTone;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Principal",
    tone: "primary",
    items: [
      { href: "/juegos", label: "Juegos", icon: "dice" },
      { href: "/taberna", label: "La taberna", icon: "users" }
    ]
  },
  {
    label: "Lecturas y rankings",
    tone: "secondary",
    items: [
      { href: "/resenas", label: "Reseñas", icon: "document" },
      { href: "/rankings", label: "Rankings", icon: "trophy" }
    ]
  },
  {
    label: "Explorar",
    tone: "tertiary",
    items: [
      { href: "/categorias", label: "Categorías", icon: "tag" },
      { href: "/mecanicas", label: "Mecánicas", icon: "sliders" }
    ]
  }
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicDesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav className="header-nav-shell hidden lg:block" aria-label="Navegación principal">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch">
        {navGroups.map((group) => (
          <div
            key={group.tone}
            className={`header-nav-group header-nav-group-${group.tone}`}
          >
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={`header-nav-link header-nav-link-${group.tone} ${active ? "header-nav-link-active" : ""}`}
                >
                  <BrandIcon name={item.icon} size={16} className="hidden xl:inline-flex" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

export function PublicMobileMenu() {
  const panelId = "mobile-menu-panel";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
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
          <nav
            id={panelId}
            className="mobile-nav-panel"
            aria-label="Navegación principal"
          >
            <section className="mobile-nav-account mb-3">
              <p className="mobile-nav-label">Tu cuenta</p>
              <div className="mt-2">
                <PublicAuthControls profileLabel="Mi rincón" vertical={true} />
              </div>
            </section>

            <div className="space-y-3">
              {navGroups.map((group) => (
                <section key={group.tone} className={`mobile-nav-group mobile-nav-group-${group.tone}`}>
                  <p className="mobile-nav-label">{group.label}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const active = isActivePath(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          aria-current={active ? "page" : undefined}
                          className={`mobile-nav-link mobile-nav-link-${group.tone} ${active ? "mobile-nav-link-active" : ""}`}
                        >
                          <BrandIcon name={item.icon} size={18} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

          </nav>
        </>
      ) : null}
    </div>
  );
}
