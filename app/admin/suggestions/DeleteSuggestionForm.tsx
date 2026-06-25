"use client";

import { Trash2 } from "lucide-react";
import { deleteSuggestionAction } from "./actions";

interface DeleteSuggestionFormProps {
  id: string;
  name: string;
}

export function DeleteSuggestionForm({ id, name }: DeleteSuggestionFormProps) {
  return (
    <form
      action={deleteSuggestionAction}
      onSubmit={(event) => {
        if (!window.confirm(`¿Eliminar la sugerencia de "${name}"?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        className="button-danger min-h-9 px-3 text-xs flex items-center justify-center"
        type="submit"
        title="Eliminar sugerencia"
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </form>
  );
}
