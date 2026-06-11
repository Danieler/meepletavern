"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LibraryPanel } from "@/components/account/LibraryPanel";
import { useAuth } from "@/hooks/useAuth";

function formatDate(value: string | undefined) {
  if (!value) {
    return "No disponible";
  }

  try {
    return new Date(value).toLocaleString("es-ES");
  } catch {
    return value;
  }
}

export function ProfilePanel() {
  const router = useRouter();
  const { user, loading, warning, isConfigured, signOut } = useAuth();
  const [profile, setProfile] = useState<{
    id: string;
    authUserId: string;
    email: string;
    displayName: string | null;
    createdAt: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setName("");
      return;
    }

    let active = true;

    fetch("/api/account/profile", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | {
              account?: {
                id: string;
                authUserId: string;
                email: string;
                displayName: string | null;
                createdAt: string;
              };
              error?: string;
            }
          | null;

        if (!active || !payload?.account) {
          return;
        }

        setProfile(payload.account);
        setName(payload.account.displayName || "");
      })
      .catch(() => {
        if (active) {
          setFeedback("No hemos podido cargar tu perfil.");
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (!isConfigured) {
    return (
      <section className="rounded-md border border-ruby/20 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-black text-ink">Mi perfil</h1>
        <p className="mt-3 text-sm font-semibold text-ruby">
          Supabase no está configurado todavía, así que el perfil de usuario final aún no puede funcionar.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-black text-ink">Mi perfil</h1>
        <p className="mt-3 text-sm font-semibold text-ink/60">Cargando tu sesión...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-black text-ink">Mi perfil</h1>
        <p className="mt-3 text-sm font-semibold text-ink/65">
          Necesitas entrar con tu cuenta para ver esta sección.
        </p>
        <Link className="button-primary mt-5 inline-flex" href="/auth?next=%2Fmi-perfil">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <div className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-moss">Mi perfil</p>
              <h1 className="mt-2 text-3xl font-black text-ink">
                {profile?.displayName || user.email || "Usuario"}
              </h1>
              <p className="mt-2 text-sm font-semibold text-ink/60">
                Gestiona aquí los datos básicos de tu cuenta.
              </p>
            </div>
            <button
              type="button"
              className="button-secondary"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                const result = await signOut();
                setSigningOut(false);
                if (result.ok) {
                  router.replace("/");
                  router.refresh();
                  return;
                }
                setFeedback(result.message ?? "No hemos podido cerrar la sesión.");
              }}
            >
              {signingOut ? "Saliendo..." : "Cerrar sesión"}
            </button>
          </div>

          {warning ? (
            <div className="mt-5 rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
              {warning}
            </div>
          ) : null}

          {feedback ? (
            <div className="mt-5 rounded-md border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">
              {feedback}
            </div>
          ) : null}

          <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);
              const response = await fetch("/api/account/profile", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ displayName: name })
              });
              const payload = (await response.json().catch(() => null)) as
                | {
                    account?: {
                      id: string;
                      authUserId: string;
                      email: string;
                      displayName: string | null;
                      createdAt: string;
                    };
                    error?: string;
                  }
                | null;
              setSaving(false);
              if (!response.ok || !payload?.account) {
                setFeedback(payload?.error || "No hemos podido actualizar tu perfil.");
                return;
              }

              setProfile(payload.account);
              setName(payload.account.displayName || "");
              setFeedback("Perfil actualizado.");
              if (response.ok) {
                router.refresh();
              }
            }}
          >
            <label className="block">
              <span className="text-sm font-bold text-ink">Nombre visible</span>
              <input
                className="focus-ring mt-2 min-h-11 w-full rounded-md border border-ink/10 bg-white px-3 text-sm text-ink"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tu nombre"
              />
            </label>

            <button className="button-primary" disabled={saving} type="submit">
              {saving ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>
        </div>

        <LibraryPanel embedded />
      </div>

      <aside className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-black text-ink">Datos de la cuenta</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-bold text-ink/50">Email</dt>
            <dd className="mt-1 font-semibold text-ink">{profile?.email || user.email || "No disponible"}</dd>
          </div>
          <div>
            <dt className="font-bold text-ink/50">Cuenta creada</dt>
            <dd className="mt-1 font-semibold text-ink">{formatDate(profile?.createdAt || user.created_at)}</dd>
          </div>
          <div>
            <dt className="font-bold text-ink/50">Email confirmado</dt>
            <dd className="mt-1 font-semibold text-ink">
              {user.email_confirmed_at ? formatDate(user.email_confirmed_at) : "Pendiente"}
            </dd>
          </div>
        </dl>
      </aside>
    </section>
  );
}
