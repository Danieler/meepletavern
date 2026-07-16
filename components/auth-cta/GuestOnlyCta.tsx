"use client";

import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
import { useAuth } from "@/hooks/useAuth";

type GuestOnlyCtaProps = {
  title: string;
  description: string;
  buttonLabel: string;
  next: string;
  context?: "home" | "catalog" | "game" | "tavern" | "review" | "header";
  intent?: string;
  className?: string;
};

export function GuestOnlyCta({
  title,
  description,
  buttonLabel,
  next,
  context = "tavern",
  intent,
  className
}: GuestOnlyCtaProps) {
  const { user, loading } = useAuth();

  if (loading || user) {
    return null;
  }

  return (
    <section className={["rounded-lg border border-accent/20 bg-surface-dark p-5 text-white shadow-soft sm:p-6", className].filter(Boolean).join(" ")}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div>
          <p className="tavern-eyebrow text-accent">Tu rincón</p>
          <h2 className="font-display mt-2 text-2xl font-bold leading-tight">{title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-text-on-dark-muted">{description}</p>
        </div>
        <AuthCtaButton context={context} className="justify-center" next={intent ? next : undefined} intent={intent}>
          {buttonLabel}
        </AuthCtaButton>
      </div>
    </section>
  );
}
