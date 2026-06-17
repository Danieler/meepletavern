"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileVisibility } from "@prisma/client";
import { PublicShell } from "@/components/PublicShell";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, isConfigured } = useAuth();
  
  type ProfileFormData = {
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    profileVisibility: ProfileVisibility;
    collectionVisibility: ProfileVisibility;
  };

  const [formData, setFormData] = useState<ProfileFormData>({
    username: "",
    displayName: "",
    bio: "",
    avatarUrl: "",
    profileVisibility: ProfileVisibility.PUBLIC,
    collectionVisibility: ProfileVisibility.PUBLIC
  });
  
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user && !loading) {
      router.push("/auth?next=%2Fmi-perfil%2Fajustes");
      return;
    }

    if (user) {
      fetch("/api/account/profile", { cache: "no-store" })
        .then(async (res) => {
          const payload = await res.json();
          if (payload.account) {
            setFormData({
              username: payload.account.profile?.username || "",
              displayName: payload.account.displayName || "",
              bio: payload.account.profile?.bio || "",
              avatarUrl: payload.account.profile?.avatarUrl || "",
              profileVisibility: payload.account.profile?.profileVisibility || ProfileVisibility.PUBLIC,
              collectionVisibility: payload.account.profile?.collectionVisibility || ProfileVisibility.PUBLIC
            });
          }
        })
        .finally(() => setFetching(false));
    }
  }, [user, loading, router]);

  if (!isConfigured || loading || fetching) {
    return (
      <PublicShell>
        <main className="container-page py-20 text-center">
          <p className="text-ink/60 font-bold uppercase tracking-widest text-xs">Cargando ajustes...</p>
        </main>
      </PublicShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const payload = await res.json();

      if (res.ok) {
        setFeedback({ type: "success", message: "Perfil actualizado correctamente." });
      } else {
        setFeedback({ type: "error", message: payload.error || "Error al actualizar el perfil." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Error de red al intentar guardar." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <div className="max-w-2xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl font-black text-ink">Ajustes de perfil</h1>
            <p className="mt-2 text-ink/60 font-bold">Personaliza cómo te ven otros usuarios en MeepleTavern.</p>
          </header>

          {feedback && (
            <div className={`mb-8 p-4 rounded-md border font-bold text-sm ${
              feedback.type === "success" ? "bg-moss/10 border-moss/20 text-moss" : "bg-ruby/10 border-ruby/20 text-ruby"
            }`}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="tavern-card p-6 sm:p-8 space-y-6">
              <div>
                <label className="block text-sm font-black text-ink mb-2">Nombre de usuario (@)</label>
                <input
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  placeholder="nombre_de_usuario"
                  className="focus-ring h-11 w-full rounded-md border border-ink/10 bg-white px-3 text-sm text-ink"
                  required
                />
                <p className="mt-2 text-xs text-ink/40">Este nombre se usará en tu URL: meepletavern.com/u/{formData.username || "usuario"}</p>
              </div>

              <div>
                <label className="block text-sm font-black text-ink mb-2">Nombre visible</label>
                <input
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Tu nombre real o alias"
                  className="focus-ring h-11 w-full rounded-md border border-ink/10 bg-white px-3 text-sm text-ink"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-black text-ink mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Cuéntanos un poco sobre ti y tus juegos favoritos..."
                  className="focus-ring min-h-[100px] w-full rounded-md border border-ink/10 bg-white p-3 text-sm text-ink resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-ink mb-2">URL del Avatar (opcional)</label>
                <input
                  value={formData.avatarUrl}
                  onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://ejemplo.com/mi-foto.jpg"
                  className="focus-ring h-11 w-full rounded-md border border-ink/10 bg-white px-3 text-sm text-ink"
                />
              </div>
            </section>

            <section className="tavern-card p-6 sm:p-8 space-y-6">
              <h2 className="text-xl font-black text-ink">Privacidad</h2>
              
              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-black text-ink mb-3">Visibilidad del perfil</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, profileVisibility: ProfileVisibility.PUBLIC })}
                      className={`flex-1 py-3 px-4 rounded-md border text-sm font-bold transition ${
                        formData.profileVisibility === ProfileVisibility.PUBLIC 
                          ? "bg-ink text-white border-ink" 
                          : "bg-white text-ink/60 border-ink/10 hover:border-ink/20"
                      }`}
                    >
                      Público
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, profileVisibility: ProfileVisibility.PRIVATE })}
                      className={`flex-1 py-3 px-4 rounded-md border text-sm font-bold transition ${
                        formData.profileVisibility === ProfileVisibility.PRIVATE 
                          ? "bg-ink text-white border-ink" 
                          : "bg-white text-ink/60 border-ink/10 hover:border-ink/20"
                      }`}
                    >
                      Privado
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ink/40">Si es privado, solo tú podrás ver tu perfil y no aparecerás en el directorio.</p>
                </div>

                <div>
                  <label className="block text-sm font-black text-ink mb-3">Visibilidad de la colección</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, collectionVisibility: ProfileVisibility.PUBLIC })}
                      className={`flex-1 py-3 px-4 rounded-md border text-sm font-bold transition ${
                        formData.collectionVisibility === ProfileVisibility.PUBLIC 
                          ? "bg-ink text-white border-ink" 
                          : "bg-white text-ink/60 border-ink/10 hover:border-ink/20"
                      }`}
                    >
                      Público
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, collectionVisibility: ProfileVisibility.PRIVATE })}
                      className={`flex-1 py-3 px-4 rounded-md border text-sm font-bold transition ${
                        formData.collectionVisibility === ProfileVisibility.PRIVATE 
                          ? "bg-ink text-white border-ink" 
                          : "bg-white text-ink/60 border-ink/10 hover:border-ink/20"
                      }`}
                    >
                      Privado
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ink/40">Si es privado, tus juegos no se mostrarán en tu perfil ni en las páginas de juegos.</p>
                </div>
              </div>
            </section>

            <div className="flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={saving}
                className="button-primary px-8"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              
              <button
                type="button"
                onClick={() => router.push("/mi-perfil")}
                className="text-sm font-bold text-ink/40 hover:text-ink transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </main>
    </PublicShell>
  );
}
