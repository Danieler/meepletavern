"use client";

import { useActionState } from "react";
import { FileInput, Loader2 } from "lucide-react";
import {
  convertCandidateAction,
  type CandidateConversionActionState
} from "@/app/admin/candidates/[id]/actions";

const initialState: CandidateConversionActionState = {};

export function CandidateConvertForm({ candidateId }: { candidateId: string }) {
  const [state, action, isPending] = useActionState(convertCandidateAction, initialState);

  return (
    <div className="flex flex-col items-start gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={candidateId} />
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <FileInput size={18} aria-hidden="true" />}
          {isPending ? "Creando ficha…" : "Crear ficha y abrir"}
        </button>
      </form>
      {state.error ? (
        <p
          className="max-w-md rounded-md border border-ruby/20 bg-ruby/10 px-3 py-2 text-sm font-semibold text-ruby"
          role="alert"
          aria-live="assertive"
        >
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
