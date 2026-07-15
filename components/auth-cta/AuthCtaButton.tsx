"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  buildAuthHref,
  POST_SIGNUP_ONBOARDING_PATH,
  type AuthMode,
  type AuthContext
} from "@/components/auth-cta/authCtaUrl";
import { trackEvent } from "@/lib/privacySafeAnalytics";

type AuthCtaButtonProps = {
  variant?: "primary" | "secondary" | "subtle" | "hero-primary" | "hero-secondary";
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
  home: "Guardar mi primer juego",
  catalog: "Guardar para después",
  game: "Entrar y guardar",
  tavern: "Guardar mi rincón",
  review: "Guardar mis opiniones",
  header: "Guardar mi ludoteca"
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
  const resolvedNext =
    next ||
    (mode === "register" && !intent && !authContext
      ? POST_SIGNUP_ONBOARDING_PATH
      : pathname || "/");
  const href = buildAuthHref({ mode, next: resolvedNext, intent, authContext });
  const baseClass =
    variant === "primary"
      ? "button-primary"
      : variant === "secondary"
        ? "button-secondary"
        : variant === "hero-primary"
          ? "button-hero-primary"
          : variant === "hero-secondary"
            ? "button-hero-secondary"
            : "inline-flex min-h-10 items-center text-sm font-extrabold text-parchment/85 transition hover:text-white hover:underline";

  function handleClick() {
    trackEvent("save_started", {
      surface: context,
      target: context === "catalog" ? "catalog" : context === "tavern" ? "tavern" : context === "review" ? "review" : "library",
      action: intent ? "pending_intent" : "open_auth"
    });
    trackEvent("auth_started", {
      surface: context,
      mode,
      source: "cta"
    });
  }

  return (
    <Link className={[baseClass, className].filter(Boolean).join(" ")} href={href} aria-label={ariaLabel} onClick={handleClick}>
      {children || defaultLabels[context]}
    </Link>
  );
}
