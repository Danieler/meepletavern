"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, LibraryBig, Gamepad2, ShoppingCart, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthPromptModal } from "@/components/auth-cta/AuthPromptModal";
import { useAuth } from "@/hooks/useAuth";
import { LibraryOnboardingTooltip } from "@/components/account/LibraryOnboardingTooltip";

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
  const pathname = usePathname();
  const [state, setState] = useState<LibraryState>({
    owned: false,
    wantToPlay: false,
    wantToBuy: false,
    played: false
  });
  const [busy, setBusy] = useState<keyof LibraryState | null>(null);
  const [ready, setReady] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState<string | null>(null);

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

  const toggleStatus = async (key: keyof LibraryState) => {
    // If they click any button, dismiss the onboarding tooltip
    localStorage.setItem("meepletavern_library_onboarding_seen", "true");

    if (!user) {
      setAuthModalTitle(getModalTitleForStatus(key));
      return;
    }

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

  useEffect(() => {
    // If the user already has this game marked in their library, they know how to use the feature.
    // Silently mark the onboarding as seen.
    if (hasAny) {
      localStorage.setItem("meepletavern_library_onboarding_seen", "true");
    }
  }, [hasAny]);

  const showNeutralState = !user;

  return (
    <>
      <section className="relative rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <LibraryOnboardingTooltip />
        <p className="tavern-eyebrow">Mi ludoteca</p>
        <h2 className="mt-2 text-lg font-black text-ink">Añade este juego a tu ludoteca</h2>
        <div className="mt-4 grid gap-2">
          <ToggleButton
            label="Lo tengo en casa"
            active={showNeutralState ? false : state.owned}
            loading={!showNeutralState && busy === "owned"}
            disabled={loading || !ready}
            icon={<Check size={18} />}
            onClick={() => toggleStatus("owned")}
          />
          <ToggleButton
            label="Quiero probarlo"
            active={showNeutralState ? false : state.wantToPlay}
            loading={!showNeutralState && busy === "wantToPlay"}
            disabled={loading || !ready}
            icon={<Gamepad2 size={18} />}
            onClick={() => toggleStatus("wantToPlay")}
          />
          <ToggleButton
            label="Lo tengo en la lista"
            active={showNeutralState ? false : state.wantToBuy}
            loading={!showNeutralState && busy === "wantToBuy"}
            disabled={loading || !ready}
            icon={<ShoppingCart size={18} />}
            onClick={() => toggleStatus("wantToBuy")}
          />
          <ToggleButton
            label="Lo he jugado"
            active={showNeutralState ? false : state.played}
            loading={!showNeutralState && busy === "played"}
            disabled={loading || !ready}
            icon={<Trophy size={18} />}
            onClick={() => toggleStatus("played")}
          />

          {user && hasAny ? (
            <Link className="button-secondary justify-start mt-2" href="/mi-perfil">
              <LibraryBig size={18} aria-hidden="true" />
              Ver mi ludoteca
            </Link>
          ) : null}
        </div>
      </section>
      <AuthPromptModal
        isOpen={Boolean(authModalTitle)}
        onClose={() => setAuthModalTitle(null)}
        title={authModalTitle || "Guarda este juego en tu ludoteca"}
        next={pathname || "/"}
      />
    </>
  );
}

function getModalTitleForStatus(key: keyof LibraryState) {
  if (key === "owned") return "Crea tu ludoteca para guardar este juego";
  if (key === "wantToPlay") return "Crea tu ludoteca para marcar este juego como pendiente";
  if (key === "played") return "Crea tu ludoteca para puntuar este juego";
  return "Crea tu ludoteca para añadir este juego a una lista";
}

function ToggleButton({
  label,
  active,
  loading,
  disabled,
  icon,
  onClick
}: {
  label: string;
  active: boolean;
  loading: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "button-primary justify-start" : "button-secondary justify-start"}
      disabled={disabled || loading}
      onClick={onClick}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-left">{loading ? "Guardando..." : label}</span>
    </button>
  );
}
