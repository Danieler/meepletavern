"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { AuthPromptModal } from "@/components/auth-cta/AuthPromptModal";
import { useAuth } from "@/hooks/useAuth";
import { setPendingAction } from "@/lib/pendingActions";

export function GameCardSaveButton({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const next = pathname || "/";

  const handleAuthSuccess = () => {
    setOpen(false);
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
        title={`Te guardamos ${gameTitle}`}
        description="Entra en segundos y este juego quedará en tu ludoteca para recuperarlo después."
        next={next}
        intent="save_game"
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
