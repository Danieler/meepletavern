"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buildAuthHref, currentPathWithSearch, type AuthMode } from "@/components/auth-cta/authCtaUrl";

type AuthCtaButtonProps = {
  variant?: "primary" | "secondary" | "subtle";
  context?: "home" | "catalog" | "game" | "tavern" | "review" | "header";
  mode?: AuthMode;
  next?: string;
  intent?: string;
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

const defaultLabels: Record<NonNullable<AuthCtaButtonProps["context"]>, string> = {
  home: "Crear mi ludoteca gratis",
  catalog: "Crear ludoteca gratis",
  game: "Crear cuenta gratis",
  tavern: "Unirme gratis",
  review: "Crear cuenta gratis",
  header: "Crear mi ludoteca"
};

export function AuthCtaButton({
  variant = "primary",
  context = "header",
  mode = "register",
  next,
  intent,
  children,
  className,
  "aria-label": ariaLabel
}: AuthCtaButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resolvedNext = next || currentPathWithSearch(pathname, searchParams);
  const href = buildAuthHref({ mode, next: resolvedNext, intent });
  const baseClass =
    variant === "primary"
      ? "button-primary"
      : variant === "secondary"
        ? "button-secondary"
        : "inline-flex min-h-10 items-center text-sm font-extrabold text-parchment/85 transition hover:text-white hover:underline";

  return (
    <Link className={[baseClass, className].filter(Boolean).join(" ")} href={href} aria-label={ariaLabel}>
      {children || defaultLabels[context]}
    </Link>
  );
}
