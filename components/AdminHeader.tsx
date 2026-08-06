"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminLanguageSelector } from "@/components/AdminLanguageSelector";
import { useAdminI18n } from "@/lib/adminI18n";

export function AdminHeader() {
  const { t } = useAdminI18n();
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/games", labelKey: "nav.games" as const },
    { href: "/admin/reviews", labelKey: "nav.reviews" as const },
    { href: "/admin/categories", labelKey: "nav.categories" as const },
    { href: "/admin/mechanics", labelKey: "nav.mechanics" as const },
    { href: "/admin/tavern", labelKey: "nav.tavern" as const },
    { href: "/admin/sources", labelKey: "nav.sources" as const },
    { href: "/admin/import", labelKey: "nav.import" as const },
    { href: "/admin/candidates", labelKey: "nav.candidates" as const },
    { href: "/admin/suggestions", labelKey: "nav.suggestions" as const },
  ];

  return (
    <header className="border-b border-ink/10 bg-white/92 shadow-sm">
      <div className="container-page flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
          <Link href="/admin/games" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white shadow-sm">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="tavern-meta block">MeepleTavern</span>
              <span className="font-display block text-xl font-bold leading-tight text-ink">
                {t("nav.adminPanel")}
              </span>
            </span>
          </Link>
          <div className="sm:hidden">
            <AdminLanguageSelector />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap gap-2 text-sm font-semibold" aria-label={t("nav.ariaLabel")}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  className={
                    isActive
                      ? "button-secondary min-h-10 border-moss/50 bg-moss/10 text-moss-dark font-bold"
                      : "button-secondary min-h-10"
                  }
                  href={item.href}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
          <div className="hidden sm:block">
            <AdminLanguageSelector />
          </div>
        </div>
      </div>
    </header>
  );
}
