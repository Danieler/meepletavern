"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthPromptModal } from "@/components/auth-cta/AuthPromptModal";
import { currentPathWithSearch } from "@/components/auth-cta/authCtaUrl";
import { useAuth } from "@/hooks/useAuth";

export function GameCardSaveButton({ gameTitle }: { gameTitle: string }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const next = currentPathWithSearch(pathname, searchParams);

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
          setOpen(true);
        }}
        aria-label={`Guardar ${gameTitle} en tu ludoteca`}
      >
        + Guardar
      </button>
      <AuthPromptModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Guarda este juego en tu ludoteca"
        description="Crea tu cuenta gratis para guardar juegos, puntuarlos y preparar tu próxima partida."
        next={next}
        intent="save_game"
      />
    </>
  );
}
