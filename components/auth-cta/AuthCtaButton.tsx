"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildAuthHref, type AuthMode, type AuthContext } from "@/components/auth-cta/authCtaUrl";

type AuthCtaButtonProps = {
  variant?: "primary" | "secondary" | "subtle";
  context?: "home" | "catalog" | "game" | "tavern" | "review" | "header";
  mode?: AuthMode;
  next?: string;
  intent?: string;
  authContext?: AuthContext;
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

const defaultLabels: Record<NonNullable<AuthCtaButtonProps["context"]>, string> = {
  home: "Crear mi ludoteca gratis",
  catalog: "Crear gratis",
  game: "Crear mi ludoteca gratis",
  tavern: "Unirme gratis",
  review: "Crear mi ludoteca gratis",
  header: "Crear mi ludoteca gratis"
};

export function AuthCtaButton({
  variant = "primary",
  context = "header",
  mode = "register",
  next,
  intent,
  authContext,
  children,
  className,
  "aria-label": ariaLabel
}: AuthCtaButtonProps) {
  const pathname = usePathname();
  const resolvedNext = next || pathname || "/";
  const href = buildAuthHref({ mode, next: resolvedNext, intent, authContext });
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
