"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LibraryBig, Gamepad2, ShoppingCart, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type GameLibraryPanelProps = {
  gameId: string;
};

type LibraryState = {
  owned: boolean;
  wantToPlay: boolean;
  wantToBuy: boolean;
  played: boolean;
};

export function GameLibraryPanel({ gameId }: GameLibraryPanelProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<LibraryState>({
    owned: false,
    wantToPlay: false,
    wantToBuy: false,
    played: false
  });
  const [busy, setBusy] = useState<keyof LibraryState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setReady(true);
      return;
    }

    let active = true;

    fetch(`/api/account/library?gameId=${encodeURIComponent(gameId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | {
              entry?: {
                gameId: string;
                owned: boolean;
                wantToPlay: boolean;
                wantToBuy: boolean;
                played: boolean;
              } | null;
            }
          | null;

        if (!active) return;

        const entry = payload?.entry;
        if (entry) {
          setState({
            owned: entry.owned,
            wantToPlay: entry.wantToPlay,
            wantToBuy: entry.wantToBuy,
            played: entry.played
          });
        }
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [gameId, user]);

  if (loading || !ready || !user) {
    return null;
  }

  const toggleStatus = async (key: keyof LibraryState) => {
    setBusy(key);
    const nextValue = !state[key];
    
    const response = await fetch("/api/account/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        [key]: nextValue
      })
    });

    if (response.ok) {
      setState((current) => ({ ...current, [key]: nextValue }));
      router.refresh();
    }
    setBusy(null);
  };

  const hasAny = state.owned || state.wantToPlay || state.wantToBuy || state.played;

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-black text-ink">Mi ludoteca</h2>
      <div className="mt-4 grid gap-2">
        <ToggleButton
          label="Lo tengo en casa"
          active={state.owned}
          loading={busy === "owned"}
          icon={<Check size={18} />}
          onClick={() => toggleStatus("owned")}
        />
        <ToggleButton
          label="Quiero probarlo"
          active={state.wantToPlay}
          loading={busy === "wantToPlay"}
          icon={<Gamepad2 size={18} />}
          onClick={() => toggleStatus("wantToPlay")}
        />
        <ToggleButton
          label="Lo tengo en la lista"
          active={state.wantToBuy}
          loading={busy === "wantToBuy"}
          icon={<ShoppingCart size={18} />}
          onClick={() => toggleStatus("wantToBuy")}
        />
        <ToggleButton
          label="Lo he jugado"
          active={state.played}
          loading={busy === "played"}
          icon={<Trophy size={18} />}
          onClick={() => toggleStatus("played")}
        />

        {hasAny ? (
          <Link className="button-secondary justify-start mt-2" href="/mi-perfil">
            <LibraryBig size={18} aria-hidden="true" />
            Ver mi ludoteca
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function ToggleButton({
  label,
  active,
  loading,
  icon,
  onClick
}: {
  label: string;
  active: boolean;
  loading: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "button-primary justify-start" : "button-secondary justify-start"}
      disabled={loading}
      onClick={onClick}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-left">{loading ? "Guardando..." : label}</span>
    </button>
  );
}
