"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Eye, EyeOff, Heart, ListPlus, Loader2, Plus } from "lucide-react";
import { GameSuggestionForm } from "@/components/GameSuggestionForm";
import type { MyGameListSummary } from "@/lib/gameLists";

export function GameListsManager({ initialLists }: { initialLists: MyGameListSummary[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/account/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, visibility })
      });
      const payload = (await response.json().catch(() => null)) as { list?: { slug: string }; error?: string } | null;
      if (!response.ok || !payload?.list) throw new Error(payload?.error || "No se pudo crear la lista.");
      router.push(`/mi-perfil/listas/${encodeURIComponent(payload.list.slug)}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la lista.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="tavern-eyebrow">Tu rincón</p>
          <h1 className="font-display mt-2 text-4xl font-bold text-wood">Mis listas</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-walnut/65">
            Guarda favoritos, ideas para una partida o selecciones que quieras compartir.
          </p>
        </div>
        <Link href="/mi-perfil" className="button-secondary">Volver a mi perfil</Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {initialLists.map((list) => (
          <Link
            key={list.id}
            href={`/mi-perfil/listas/${encodeURIComponent(list.slug)}`}
            className="tavern-card group flex min-h-40 flex-col p-5 transition hover:-translate-y-0.5 hover:border-ember/45"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ember/10 text-ember">
                {list.isDefault ? <Heart size={20} aria-hidden="true" /> : <ListPlus size={20} aria-hidden="true" />}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-walnut/45">
                {list.visibility === "PUBLIC" ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                {list.visibility === "PUBLIC" ? "Pública" : "Privada"}
              </span>
            </div>
            <h2 className="font-display mt-4 text-2xl font-bold text-wood group-hover:text-ember">{list.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-walnut/60">
              {list.description || (list.isDefault ? "Tu lista fija para los juegos que más te gustan." : "Sin descripción todavía.")}
            </p>
            <p className="mt-auto pt-4 text-xs font-black uppercase tracking-[0.1em] text-walnut/45">
              {list.gameCount} {list.gameCount === 1 ? "juego" : "juegos"}
            </p>
          </Link>
        ))}
      </section>

      <section className="tavern-panel p-5 sm:p-6" aria-labelledby="new-list-title">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-moss/10 text-moss">
            <Plus size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="tavern-eyebrow">Crear nueva lista</p>
            <h2 id="new-list-title" className="font-display mt-1 text-2xl font-bold text-wood">Nueva lista</h2>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={createList}>
          <label>
            <span className="field-label">Nombre</span>
            <input required minLength={2} maxLength={60} value={name} className="field-input mt-2" onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span className="field-label">Visibilidad</span>
            <select value={visibility} className="field-input mt-2" onChange={(event) => setVisibility(event.target.value as "PUBLIC" | "PRIVATE")}>
              <option value="PRIVATE">Privada</option>
              <option value="PUBLIC">Pública</option>
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="field-label">Descripción opcional</span>
            <textarea rows={3} maxLength={300} value={description} className="field-input mt-2 resize-y" onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="button-primary" disabled={loading}>
              {loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
              {loading ? "Creando..." : "Crear lista"}
            </button>
            {error ? <p className="mt-3 text-sm font-semibold text-ruby" role="status">{error}</p> : null}
          </div>
        </form>
      </section>

      <GameSuggestionForm />
    </div>
  );
}
