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
    return <span className="text-sm font-semibold text-parchment/60">Cuenta...</span>;
  }

  if (!user) {
    return (
      <Link className="button-secondary min-h-10 border-ember/40 bg-white/10 px-3 text-parchment hover:bg-ember hover:text-white" href="/auth">
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
      <Link className="rounded-md px-3 py-2 text-sm font-bold text-parchment/80 transition hover:bg-white/10 hover:text-ember" href="/mi-perfil">
        {label}
      </Link>
      <button
        type="button"
        className="button-secondary min-h-10 border-ember/40 bg-white/10 px-3 text-parchment hover:bg-ember hover:text-white"
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
