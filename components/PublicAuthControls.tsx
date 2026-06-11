"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export function PublicAuthControls() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <span className="text-sm font-semibold text-ink/45">Cuenta...</span>;
  }

  if (!user) {
    return (
      <Link className="button-secondary min-h-10 px-3" href="/auth">
        Mi cuenta
      </Link>
    );
  }

  const label = getDisplayName(
    user.email,
    user.user_metadata?.display_name,
    user.user_metadata?.name
  );

  return (
    <div className="flex items-center gap-2">
      <Link className="rounded-md px-3 py-2 text-sm font-bold text-ink/70 transition hover:bg-ink/5 hover:text-ink" href="/mi-perfil">
        {label}
      </Link>
      <button
        type="button"
        className="button-secondary min-h-10 px-3"
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
