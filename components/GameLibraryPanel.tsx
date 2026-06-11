"use client";

import Link from "next/link";
import { Check, LibraryBig } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type GameLibraryPanelProps = {
  gameId: string;
};

export function GameLibraryPanel({ gameId }: GameLibraryPanelProps) {
  const { user, loading } = useAuth();
  const [inLibrary, setInLibrary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setReady(true);
      setInLibrary(false);
      return;
    }

    let active = true;

    fetch("/api/account/library", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | {
              entries?: Array<{ gameId: string }>;
            }
          | null;

        if (!active) {
          return;
        }

        setInLibrary(Boolean(payload?.entries?.some((entry) => entry.gameId === gameId)));
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [gameId, user]);

  if (loading || !ready || !user) {
    return null;
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-black text-ink">Mi colección</h2>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          className={inLibrary ? "button-primary justify-start" : "button-secondary justify-start"}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const response = await fetch("/api/account/library", {
              method: inLibrary ? "DELETE" : "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ gameId })
            });

            setBusy(false);

            if (response.ok) {
              setInLibrary((current) => !current);
            }
          }}
        >
          <Check size={18} aria-hidden="true" />
          {busy ? "Guardando..." : inLibrary ? "En mi colección" : "Lo tengo"}
        </button>

        {inLibrary ? (
          <Link className="button-secondary justify-start" href="/mi-perfil">
            <LibraryBig size={18} aria-hidden="true" />
            Ver mi colección
          </Link>
        ) : null}
      </div>
    </section>
  );
}
