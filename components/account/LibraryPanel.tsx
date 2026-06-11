"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type LibraryEntry = {
  id: string;
  gameId: string;
  createdAt: string;
  game: {
    id: string;
    slug: string;
    title: string;
    coverImageUrl?: string | null;
  };
};

type LibraryPanelProps = {
  embedded?: boolean;
};

export function LibraryPanel({ embedded = false }: LibraryPanelProps) {
  const { user, loading, warning, isConfigured } = useAuth();
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [fetching, setFetching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setFetching(false);
      return;
    }

    let active = true;
    setFetching(true);
    setFeedback(null);

    fetch("/api/account/library", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | {
              entries?: LibraryEntry[];
              error?: string;
            }
          | null;

        if (!active) {
          return;
        }

        if (!response.ok) {
          setFeedback(payload?.error || "No hemos podido cargar tu colección.");
          setEntries([]);
          return;
        }

        setEntries(payload?.entries || []);
      })
      .catch(() => {
        if (active) {
          setFeedback("No hemos podido cargar tu colección.");
          setEntries([]);
        }
      })
      .finally(() => {
        if (active) {
          setFetching(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (!isConfigured) {
    return (
      <section className="rounded-md border border-ruby/20 bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-black text-ink">Mi colección</h1>
        <p className="mt-3 text-sm font-semibold text-ruby">
          Supabase no está configurado todavía, así que la colección personal aún no puede funcionar.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-black text-ink">Mi colección</h1>
        <p className="mt-3 text-sm font-semibold text-ink/60">Cargando tu sesión...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-black text-ink">Mi colección</h1>
        <p className="mt-3 text-sm font-semibold text-ink/65">
          Entra con tu cuenta para guardar los juegos que ya tienes.
        </p>
        <Link className="button-primary mt-5 inline-flex" href="/auth?next=%2Fmi-perfil">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {embedded ? (
        <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-black text-ink">Mi colección</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/72">
            Aquí verás los juegos que has marcado como parte de tu colección.
          </p>
        </section>
      ) : (
        <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
          <p className="text-sm font-bold uppercase text-ember">Cuenta</p>
          <h1 className="mt-3 text-4xl font-black text-ink sm:text-5xl">Mi colección</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink/72">
            Aquí verás los juegos que has marcado como parte de tu colección.
          </p>
        </section>
      )}

      {warning ? (
        <section className="rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
          {warning}
        </section>
      ) : null}

      {feedback ? (
        <section className="rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
          {feedback}
        </section>
      ) : null}

      {fetching ? (
        <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-ink/65">Cargando tus juegos...</p>
        </section>
      ) : entries.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft"
            >
              <Link href={`/juegos/${entry.game.slug}`} className="block">
                <div className="aspect-[4/3] bg-ink/5">
                  {entry.game.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.game.coverImageUrl}
                      alt={entry.game.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-black text-ink">{entry.game.title}</h2>
                  <p className="mt-2 text-sm font-semibold text-ink/55">
                    Añadido el {new Date(entry.createdAt).toLocaleDateString("es-ES")}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-ink/65">
            Todavía no has añadido juegos a tu colección. Entra en una ficha y pulsa
            <span className="font-black text-ink"> Lo tengo</span>.
          </p>
        </section>
      )}
    </section>
  );
}
