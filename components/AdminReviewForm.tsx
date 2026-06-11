"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import {
  createAdminReviewAction,
  updateAdminReviewAction,
  type AdminReviewActionState
} from "@/app/admin/reviews/actions";

const initialState: AdminReviewActionState = {};

type ReviewGameOption = {
  id: string;
  title: string;
};

type ReviewFormValue = {
  id?: string;
  gameId: string;
  authorName: string;
  title: string;
  summary: string;
  body: string;
};

export function CreateAdminReviewForm({
  initialValue,
  gameOptions
}: {
  initialValue: ReviewFormValue;
  gameOptions: ReviewGameOption[];
}) {
  const [state, action, isPending] = useActionState(createAdminReviewAction, initialState);

  return (
    <form action={action} className="space-y-6">
      <AdminReviewFields initialValue={initialValue} gameOptions={gameOptions} />
      <div className="flex flex-wrap gap-3">
        <button className="button-primary" disabled={isPending} type="submit">
          <Save size={18} aria-hidden="true" />
          Crear reseña
        </button>
        <Link className="button-secondary" href="/admin/reviews">
          Volver
        </Link>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

export function EditAdminReviewForm({
  initialValue,
  gameOptions
}: {
  initialValue: ReviewFormValue;
  gameOptions: ReviewGameOption[];
}) {
  const [state, action, isPending] = useActionState(updateAdminReviewAction, initialState);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={initialValue.id} />
      <AdminReviewFields initialValue={initialValue} gameOptions={gameOptions} />
      <div className="flex flex-wrap gap-3">
        <button className="button-primary" disabled={isPending} type="submit">
          <Save size={18} aria-hidden="true" />
          Guardar reseña
        </button>
        <Link className="button-secondary" href="/admin/reviews">
          Volver
        </Link>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

function AdminReviewFields({
  initialValue,
  gameOptions
}: {
  initialValue: ReviewFormValue;
  gameOptions: ReviewGameOption[];
}) {
  return (
    <>
      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold text-ink">Datos básicos</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Juego">
            <select className="field-input" name="gameId" defaultValue={initialValue.gameId} required>
              <option value="">Selecciona un juego</option>
              {gameOptions.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Autor visible">
            <input className="field-input" name="authorName" defaultValue={initialValue.authorName} required />
          </Field>
          <Field label="Título">
            <input className="field-input" name="title" defaultValue={initialValue.title} required />
          </Field>
        </div>
      </section>

      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold text-ink">Contenido</h2>
        <div className="mt-5 space-y-4">
          <Field label="Resumen">
            <textarea
              className="field-input min-h-28 py-3"
              name="summary"
              defaultValue={initialValue.summary}
              required
            />
          </Field>
          <Field label="Reseña">
            <textarea
              className="field-input min-h-72 py-3"
              name="body"
              defaultValue={initialValue.body}
              required
            />
          </Field>
        </div>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink/60">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ActionFeedback({ state }: { state: AdminReviewActionState }) {
  if (state.error) {
    return (
      <p className="rounded-md border border-ruby/20 bg-ruby/10 px-3 py-2 text-sm font-semibold text-ruby">
        {state.error}
      </p>
    );
  }

  if (state.message) {
    return (
      <p className="rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">
        {state.message}
      </p>
    );
  }

  return null;
}
