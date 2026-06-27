"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthPromptModal } from "@/components/auth-cta/AuthPromptModal";
import { useAuth } from "@/hooks/useAuth";
import { setPendingAction, executePendingAction } from "@/lib/pendingActions";
import { trackEvent } from "@/lib/privacySafeAnalytics";

export function GameCardSaveButton({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const next = pathname || "/";

  const handleAuthSuccess = async () => {
    setOpen(false);
    const result = await executePendingAction();
    if (result && result.ok && result.type === "SAVE_GAME") {
      trackEvent("pending_action_completed");
      router.refresh();
    } else {
      router.refresh();
    }
  };

  if (loading || user) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-9 items-center rounded-md border border-ember/20 bg-ember/8 px-3 py-1.5 text-sm font-black text-ember transition hover:border-ember/35 hover:bg-ember/12"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPendingAction({ type: "SAVE_GAME", gameId, payload: { key: "wantToBuy" } });
          setOpen(true);
        }}
        aria-label={`Guardar ${gameTitle} en tu ludoteca`}
      >
        + Guardar
      </button>
      <AuthPromptModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={`Guarda ${gameTitle} en tu ludoteca`}
        description="Crea tu cuenta gratis para guardar juegos, puntuarlos y preparar tu próxima partida."
        next={next}
        intent="save_game"
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
