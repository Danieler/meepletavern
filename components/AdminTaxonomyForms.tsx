"use client";

import { useActionState } from "react";
import { Save, Trash2 } from "lucide-react";
import {
  createTaxonomyTermAction,
  deleteTaxonomyTermAction,
  renameTaxonomyTermAction,
  type TaxonomyActionState
} from "@/app/admin/taxonomy/actions";
import { useAdminI18n } from "@/lib/adminI18n";
import type { TaxonomyTermItem, TaxonomyTypeKey } from "@/lib/taxonomy";

const initialState: TaxonomyActionState = {};

export function AdminTaxonomyCreateForm({
  type,
  label
}: {
  type: TaxonomyTypeKey;
  label: string;
}) {
  const { t, tFormat } = useAdminI18n();
  const [state, formAction, isPending] = useActionState(createTaxonomyTermAction, initialState);

  const translatedLabel =
    type === "category"
      ? t("categories.label")
      : type === "mechanic"
      ? t("mechanics.label")
      : t("tavern.label");

  return (
    <form action={formAction} className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <input type="hidden" name="type" value={type} />
      <label className="block space-y-2">
        <span className="field-label">{tFormat("taxonomy.newTerm", { label: translatedLabel })}</span>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="field-input" name="name" required placeholder={t("taxonomy.namePlaceholder")} />
          <button className="button-primary" type="submit" disabled={isPending}>
            {t("taxonomy.add")}
          </button>
        </div>
      </label>
      <TaxonomyFormMessage state={state} />
    </form>
  );
}

export function AdminTaxonomyTermRow({
  term,
  type
}: {
  term: TaxonomyTermItem;
  type: TaxonomyTypeKey;
}) {
  const { t, tFormat } = useAdminI18n();
  const [renameState, renameAction, isRenaming] = useActionState(renameTaxonomyTermAction, initialState);
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteTaxonomyTermAction, initialState);

  return (
    <li className="grid gap-3 rounded-md border border-ink/10 bg-white p-4 shadow-soft lg:grid-cols-[1fr_auto] lg:items-start">
      <form action={renameAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="id" value={term.id} />
        <label className="sr-only" htmlFor={`${term.id}-name`}>
          {t("games.colName")}
        </label>
        <input id={`${term.id}-name`} className="field-input" name="name" required defaultValue={term.name} />
        <button className="button-secondary" type="submit" disabled={isRenaming}>
          <Save size={17} aria-hidden="true" />
          {t("taxonomy.rename")}
        </button>
        <TaxonomyFormMessage state={renameState} />
      </form>

      <form
        action={deleteAction}
        onSubmit={(event) => {
          if (!window.confirm(tFormat("taxonomy.confirmDelete", { name: term.name }))) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="id" value={term.id} />
        <button className="button-danger w-full lg:w-auto" type="submit" disabled={isDeleting}>
          <Trash2 size={17} aria-hidden="true" />
          {t("common.delete")}
        </button>
        <TaxonomyFormMessage state={deleteState} />
      </form>
    </li>
  );
}

function TaxonomyFormMessage({ state }: { state: TaxonomyActionState }) {
  if (state.error) {
    return <p className="mt-2 text-sm font-semibold text-ruby">{state.error}</p>;
  }

  if (state.message) {
    return <p className="mt-2 text-sm font-semibold text-moss">{state.message}</p>;
  }

  return null;
}
