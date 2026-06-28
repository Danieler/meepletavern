"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
import { useAuth } from "@/hooks/useAuth";

function getDisplayName(email: string | undefined, displayName: unknown, name: unknown) {
  if (typeof displayName === "string" && displayName.trim()) {
    return displayName.trim();
  }

  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  if (email) {
    return email.split("@")[0];
  }

  return "Mi perfil";
}

type PublicAuthControlsProps = {
  profileLabel?: string;
  /** Cuando es true, muestra los CTAs en disposición vertical (menú móvil) */
  vertical?: boolean;
};

export function PublicAuthControls({ profileLabel, vertical = false }: PublicAuthControlsProps = {}) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <span className="text-sm font-semibold text-parchment/60">Cuenta...</span>;
  }

  if (!user) {
    if (vertical) {
      // Dentro del menú móvil: CTA primario + link sutil para login
      return (
        <div className="grid gap-3">
          <AuthCtaButton context="header" className="justify-center">
            Crear cuenta gratis
          </AuthCtaButton>
          <AuthCtaButton
            variant="subtle"
            mode="login"
            context="header"
            className="justify-center text-sm font-bold text-parchment/70 hover:text-white transition py-1"
          >
            Ya tengo cuenta · Entrar
          </AuthCtaButton>
        </div>
      );
    }

    // Header desktop: un solo CTA limpio
    return (
      <AuthCtaButton
        variant="primary"
        mode="login"
        context="header"
        className="hidden lg:inline-flex whitespace-nowrap px-5 py-2 text-sm font-extrabold min-h-10"
      >
        Entrar
      </AuthCtaButton>
    );
  }

  const label = getDisplayName(
    user.email,
    user.user_metadata?.display_name,
    user.user_metadata?.name
  );

  return (
    <div className="flex items-center gap-2">
      <Link className="header-profile-link" href="/mi-perfil">
        {profileLabel || label}
      </Link>
      <button
        type="button"
        className="header-action"
        onClick={async () => {
          const result = await signOut();
          if (result.ok) {
            router.replace("/");
            router.refresh();
          }
        }}
      >
        Salir
      </button>
    </div>
  );
}
