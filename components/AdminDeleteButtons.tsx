"use client";

import { Trash2 } from "lucide-react";
import { deleteCandidateAction } from "@/app/admin/candidates/[id]/actions";
import { deleteGameEditorAction } from "@/app/admin/games/[id]/actions";

export function DeleteGameButton({
  id,
  returnTo,
  published = false,
  compact = false
}: {
  id: string;
  returnTo: string;
  published?: boolean;
  compact?: boolean;
}) {
  const confirmMessage = published
    ? "¿Eliminar este juego publicado? También desaparecerá de la web pública."
    : "¿Eliminar este juego?";

  return (
    <form
      action={deleteGameEditorAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className={compact ? "button-danger min-h-9 px-3 py-1.5" : "button-danger"} type="submit">
        <Trash2 size={16} aria-hidden="true" />
        Eliminar
      </button>
    </form>
  );
}

export function DeleteCandidateButton({
  id,
  returnTo,
  compact = false
}: {
  id: string;
  returnTo: string;
  compact?: boolean;
}) {
  return (
    <form
      action={deleteCandidateAction}
      onSubmit={(event) => {
        if (!window.confirm("¿Eliminar este candidato?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className={compact ? "button-danger min-h-9 px-3 py-1.5" : "button-danger"} type="submit">
        <Trash2 size={16} aria-hidden="true" />
        Eliminar
      </button>
    </form>
  );
}
