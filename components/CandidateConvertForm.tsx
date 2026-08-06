"use client";

import { useActionState } from "react";
import { FileInput, Loader2 } from "lucide-react";
import {
  convertCandidateAction,
  type CandidateConversionActionState
} from "@/app/admin/candidates/[id]/actions";
import { useAdminI18n } from "@/lib/adminI18n";

const initialState: CandidateConversionActionState = {};

export function CandidateConvertForm({ candidateId }: { candidateId: string }) {
  const { t } = useAdminI18n();
  const [state, action, isPending] = useActionState(convertCandidateAction, initialState);

  return (
    <div className="flex flex-col items-start gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={candidateId} />
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <FileInput size={18} aria-hidden="true" />}
          {isPending ? t("candidateConvert.creating") : t("candidateConvert.button")}
        </button>
      </form>
      {state.error ? (
        <div
          className="max-w-md rounded-md border border-ruby/20 bg-ruby/10 px-3 py-2 text-sm font-semibold text-ruby"
          role="alert"
          aria-live="assertive"
        >
          <p>{state.error}</p>
          {state.details?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 font-medium">
              {state.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          ) : null}
          {state.reference ? (
            <p className="mt-2 text-xs font-medium text-ruby/80">Referencia del error: {state.reference}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
