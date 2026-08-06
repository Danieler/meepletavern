"use client";

import { useActionState, useState, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Hash, Loader2, Save } from "lucide-react";
import { ReviewBodyEditor } from "@/components/reviews/ReviewBodyEditor";
import { REVIEW_SUMMARY_MAX_LENGTH, REVIEW_TITLE_MAX_LENGTH } from "@/lib/reviewContent";
import {
  createAdminReviewAction,
  updateAdminReviewAction,
  type AdminReviewActionState
} from "@/app/admin/reviews/actions";
import { useAdminI18n } from "@/lib/adminI18n";

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
  isApproved?: boolean;
  instagramPostId?: string | null;
  instagramHashtags?: string | null;
};

export function CreateAdminReviewForm({
  initialValue,
  gameOptions
}: {
  initialValue: ReviewFormValue;
  gameOptions: ReviewGameOption[];
}) {
  const { lang, t } = useAdminI18n();
  const [state, action, isPending] = useActionState(createAdminReviewAction, initialState);
  const intentRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="intent" ref={intentRef} defaultValue="draft" />
      <AdminReviewFields initialValue={initialValue} gameOptions={gameOptions} />
      <div className="sticky bottom-3 z-20 flex flex-wrap gap-3 rounded-md border border-ink/10 bg-white/95 p-3 shadow-soft backdrop-blur">
        <button className="button-secondary" onClick={() => { if(intentRef.current) intentRef.current.value="draft"; }} disabled={isPending} type="submit">
          {isPending && (!intentRef.current || intentRef.current.value === "draft") ? <Loader2 size={18} className="animate-spin" /> : null}
          {isPending && (!intentRef.current || intentRef.current.value === "draft") ? t("gameForm.saving") : t("gameForm.saveDraft")}
        </button>
        <button className="button-primary" onClick={() => { if(intentRef.current) intentRef.current.value="publish"; }} disabled={isPending} type="submit">
          {isPending && intentRef.current?.value === "publish" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
          {isPending && intentRef.current?.value === "publish" ? t("gameForm.publishing") : (lang === "en" ? "Publish on web & Instagram" : "Publicar en la web e Instagram")}
        </button>
        <Link className="button-secondary" href="/admin/reviews">
          {lang === "en" ? "Back" : "Volver"}
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
  const { lang, t } = useAdminI18n();
  const [state, action, isPending] = useActionState(updateAdminReviewAction, initialState);
  const intentRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={initialValue.id} />
      <input type="hidden" name="intent" ref={intentRef} defaultValue={initialValue.isApproved ? "publish" : "draft"} />
      <AdminReviewFields initialValue={initialValue} gameOptions={gameOptions} />
      <div className="sticky bottom-3 z-20 flex flex-wrap gap-3 rounded-md border border-ink/10 bg-white/95 p-3 shadow-soft backdrop-blur">
        {initialValue.isApproved ? (
          <>
            <button className="button-primary" onClick={() => { if(intentRef.current) intentRef.current.value="publish"; }} disabled={isPending} type="submit">
              {isPending && intentRef.current?.value === "publish" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
              {isPending && intentRef.current?.value === "publish" ? t("gameForm.saving") : t("common.save")}
            </button>
            <button className="button-secondary" onClick={() => { if(intentRef.current) intentRef.current.value="draft"; }} disabled={isPending} type="submit">
              {isPending && intentRef.current?.value === "draft" ? <Loader2 size={18} className="animate-spin" /> : null}
              {isPending && intentRef.current?.value === "draft" ? (lang === "en" ? "Moving..." : "Moviendo...") : (lang === "en" ? "Move to drafts" : "Mover a borradores")}
            </button>
          </>
        ) : (
          <>
            <button className="button-secondary" onClick={() => { if(intentRef.current) intentRef.current.value="draft"; }} disabled={isPending} type="submit">
              {isPending && intentRef.current?.value === "draft" ? <Loader2 size={18} className="animate-spin" /> : null}
              {isPending && intentRef.current?.value === "draft" ? t("gameForm.saving") : t("gameForm.saveDraft")}
            </button>
            <button className="button-primary" onClick={() => { if(intentRef.current) intentRef.current.value="publish"; }} disabled={isPending} type="submit">
              {isPending && intentRef.current?.value === "publish" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
              {isPending && intentRef.current?.value === "publish" ? t("gameForm.publishing") : (lang === "en" ? "Publish on web & Instagram" : "Publicar en la web e Instagram")}
            </button>
          </>
        )}
        <Link className="button-secondary" href="/admin/reviews">
          {lang === "en" ? "Back" : "Volver"}
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
  const { lang, t } = useAdminI18n();
  const [body, setBody] = useState(initialValue.body);
  const [title, setTitle] = useState(initialValue.title);
  const [summary, setSummary] = useState(initialValue.summary);
  const [instagramHashtags, setInstagramHashtags] = useState(initialValue.instagramHashtags || "");

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <>
      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">{lang === "en" ? "Basic Data" : "Datos básicos"}</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ink/55">
              {lang === "en" ? "Game, author and public review headline." : "Juego, autor y titular público de la reseña."}
            </p>
          </div>
          {initialValue.id ? <PublicationStatus published={Boolean(initialValue.instagramPostId)} /> : null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label={lang === "en" ? "Game" : "Juego"}>
            <select className="field-input" name="gameId" defaultValue={initialValue.gameId} required>
              <option value="">{lang === "en" ? "Select a game" : "Selecciona un juego"}</option>
              {gameOptions.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label={lang === "en" ? "Visible Author" : "Autor visible"}>
            <input className="field-input" name="authorName" defaultValue={initialValue.authorName} required />
          </Field>
          <Field label={t("gameForm.titleLabel")} meta={<CharacterCount value={title} max={REVIEW_TITLE_MAX_LENGTH} />}>
            <input
              className="field-input"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={REVIEW_TITLE_MAX_LENGTH}
              required
            />
          </Field>
        </div>
      </section>

      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">{lang === "en" ? "Content" : "Contenido"}</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ink/55">
              {lang === "en" ? "Editorial summary and full body." : "Resumen editorial y cuerpo completo."}
            </p>
          </div>
          <span className="rounded-md border border-ink/10 bg-parchment px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink/55">
            {lang === "en" ? `${wordCount.toLocaleString("en-US")} words` : `${wordCount.toLocaleString("es-ES")} palabras`}
          </span>
        </div>
        <div className="mt-5 space-y-4">
          <Field label={lang === "en" ? "Summary" : "Resumen"} meta={<CharacterCount value={summary} max={REVIEW_SUMMARY_MAX_LENGTH} />}>
            <textarea
              className="field-input min-h-28 py-3"
              name="summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={REVIEW_SUMMARY_MAX_LENGTH}
              required
            />
          </Field>
          <div>
            <p className="text-sm font-bold text-ink/60">{lang === "en" ? "Review" : "Reseña"}</p>
            <div className="mt-1">
              <ReviewBodyEditor value={body} onChange={setBody} required />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-moss/15 bg-[#f3faf7] p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-moss text-white">
            <Hash size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink">Instagram</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ink/60">
              {lang === "en"
                ? "Hashtags separated by spaces or commas. They will be combined with base MeepleTavern hashtags."
                : "Hashtags separados por espacios o comas. Se combinarán con hashtags base de MeepleTavern y el juego."}
            </p>
          </div>
        </div>
        <div className="mt-5">
          <Field label="Hashtags" meta={<CharacterCount value={instagramHashtags} max={420} />}>
            <textarea
              className="field-input min-h-24 py-3"
              name="instagramHashtags"
              value={instagramHashtags}
              onChange={(event) => setInstagramHashtags(event.target.value)}
              maxLength={420}
              placeholder="#eurogames #boardgames #review"
            />
          </Field>
        </div>
      </section>
    </>
  );
}

function Field({ label, meta, children }: { label: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm font-bold text-ink/60">
        <span>{label}</span>
        {meta}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function CharacterCount({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length;

  return (
    <span className={`text-xs font-bold ${remaining < 20 ? "text-ruby" : "text-ink/40"}`}>
      {value.length.toLocaleString("es-ES")} / {max.toLocaleString("es-ES")}
    </span>
  );
}

function PublicationStatus({ published }: { published: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold ${
      published ? "border-moss/20 bg-moss/10 text-moss" : "border-ink/10 bg-parchment text-ink/50"
    }`}>
      {published ? <CheckCircle2 size={16} aria-hidden="true" /> : <CircleDashed size={16} aria-hidden="true" />}
      <span>Instagram: {published ? "publicado" : "pendiente"}</span>
    </div>
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
