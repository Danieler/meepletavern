"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
import { useAuth } from "@/hooks/useAuth";
import { getSafePublicDisplayName } from "@/lib/publicIdentity";

function getDisplayName(displayName: unknown, name: unknown) {
  if (typeof displayName === "string" && displayName.trim()) {
    return getSafePublicDisplayName(displayName, "Mi perfil");
  }

  if (typeof name === "string" && name.trim()) {
    return getSafePublicDisplayName(name, "Mi perfil");
  }

  return "Mi perfil";
}

type PublicAuthControlsProps = {
  profileLabel?: string;
  /** Cuando es true, muestra los CTAs en disposición vertical (menú móvil) */
  vertical?: boolean;
};

const accountLinks: Array<{ href: string; label: string; icon: BrandIconName }> = [
  { href: "/mi-perfil", label: "Mi ludoteca", icon: "bookmark" },
  { href: "/mi-perfil/listas", label: "Mis listas", icon: "book" },
  { href: "/comunidad/tabernas", label: "Mis tabernas", icon: "building" },
  { href: "/mi-perfil/ajustes", label: "Ajustes", icon: "settings" }
];

export function PublicAuthControls({ profileLabel, vertical = false }: PublicAuthControlsProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  if (loading) {
    return <span className="text-sm font-semibold text-parchment/60">Cuenta...</span>;
  }

  if (!user) {
    if (vertical) {
      // Dentro del menú móvil: CTA primario + link sutil para login
      return (
        <div className="grid gap-3">
          <AuthCtaButton context="header" className="justify-center">
            Guardar mi ludoteca
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
        className="inline-flex min-h-10 whitespace-nowrap px-5 py-2 text-sm font-extrabold"
      >
        Entrar
      </AuthCtaButton>
    );
  }

  const label = getDisplayName(
    user.user_metadata?.display_name,
    user.user_metadata?.name
  );

  const handleSignOut = async () => {
    setAccountOpen(false);
    const result = await signOut();
    if (result.ok) {
      router.replace("/");
      router.refresh();
    }
  };

  if (vertical) {
    return (
      <div className="grid gap-1">
        {accountLinks.map((item) => (
          <Link key={item.href} className="mobile-account-link" href={item.href} prefetch={false}>
            <BrandIcon name={item.icon} size={17} />
            <span>{item.href === "/mi-perfil" ? (profileLabel || item.label) : item.label}</span>
          </Link>
        ))}
        <button type="button" className="mobile-account-signout" onClick={handleSignOut}>
          <BrandIcon name="logout" size={17} />
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div ref={accountRef} className="header-account-menu">
      <button
        ref={accountButtonRef}
        type="button"
        className="header-account-trigger"
        aria-expanded={accountOpen}
        aria-controls="header-account-popover"
        aria-haspopup="true"
        onClick={() => setAccountOpen((current) => !current)}
      >
        <span className="header-account-avatar"><BrandIcon name="user" size={16} /></span>
        <span className="max-w-28 truncate">{profileLabel || label}</span>
        <BrandIcon name="chevron-down" size={15} className={accountOpen ? "rotate-180" : ""} />
      </button>

      {accountOpen ? (
        <div id="header-account-popover" className="header-account-popover">
          <p className="header-account-popover-label">Tu espacio</p>
          <nav aria-label="Opciones de cuenta" className="mt-2 grid gap-1">
            {accountLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="header-account-item"
                onClick={() => setAccountOpen(false)}
              >
                <BrandIcon name={item.icon} size={17} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="header-account-popover-footer">
            <button type="button" className="header-account-signout" onClick={handleSignOut}>
              <BrandIcon name="logout" size={17} />
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
