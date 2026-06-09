"use client";

import { useActionState } from "react";
import { GameStatus, type Game, type MediaAsset } from "@prisma/client";
import { ExternalLink, Rocket, Save } from "lucide-react";
import {
  publishGameEditorAction,
  saveGameEditorAction,
  type GameEditorActionState
} from "@/app/admin/games/[id]/actions";
import { normalizeGameFaq, normalizeGamePlayers } from "@/lib/editorialMappers";

type AdminFinalGameFormProps = {
  game: Game;
  mediaAssets: MediaAsset[];
};

const initialState: GameEditorActionState = {};

export function AdminFinalGameForm({ game, mediaAssets }: AdminFinalGameFormProps) {
  const [saveState, saveAction, isSaving] = useActionState(saveGameEditorAction, initialState);
  const [publishState, publishAction, isPublishing] = useActionState(publishGameEditorAction, initialState);
  const players = normalizeGamePlayers(game.players);
  const playtime = parsePlaytime(game.playtime);
  const faq = normalizeGameFaq(game.faq || game.faqs);
  const publicUrl = game.status === GameStatus.published ? `/juegos/${game.slug}` : null;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-ink/10 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink/55">Estado actual</p>
            <p className="mt-1 text-xl font-bold text-ink">{game.status}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="button-secondary" form="final-game-form" formAction={saveAction} disabled={isSaving || isPublishing}>
              <Save size={18} aria-hidden="true" />
              Guardar borrador
            </button>
            <button className="button-primary" form="final-game-form" formAction={publishAction} disabled={isSaving || isPublishing}>
              <Rocket size={18} aria-hidden="true" />
              Publicar
            </button>
            {publicUrl ? (
              <a className="button-secondary" href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={18} aria-hidden="true" />
                Ver pública
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <Feedback state={saveState} />
      <Feedback state={publishState} />

      <form id="final-game-form" className="space-y-6">
        <input type="hidden" name="id" value={game.id} />

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Datos principales</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <input className="field-input" name="title" required defaultValue={game.title || game.name} />
            </Field>
            <Field label="Slug">
              <input className="field-input" name="slug" required defaultValue={game.slug} />
            </Field>
            <Field label="Original title">
              <input className="field-input" name="originalTitle" defaultValue={game.originalTitle || ""} />
            </Field>
            <Field label="Year">
              <input className="field-input" name="year" type="number" min="1" defaultValue={game.year || ""} />
            </Field>
            <Field label="Status">
              <select className="field-input" name="status" defaultValue={game.status}>
                <option value={GameStatus.draft}>draft</option>
                <option value={GameStatus.review}>review</option>
                <option value={GameStatus.published}>published</option>
                <option value={GameStatus.archived}>archived</option>
              </select>
            </Field>
            <Field label="Difficulty">
              <input className="field-input" name="difficulty" defaultValue={game.difficulty || game.complexity || ""} />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Mesa</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Players min">
              <NumberInput name="minPlayers" defaultValue={players.min ?? game.minPlayers} />
            </Field>
            <Field label="Players max">
              <NumberInput name="maxPlayers" defaultValue={players.max ?? game.maxPlayers} />
            </Field>
            <Field label="Players ideal">
              <NumberInput name="idealPlayers" defaultValue={players.ideal ?? null} />
            </Field>
            <Field label="Playtime min">
              <NumberInput name="minPlayTime" defaultValue={playtime.min} />
            </Field>
            <Field label="Playtime max">
              <NumberInput name="maxPlayTime" defaultValue={playtime.max} />
            </Field>
            <Field label="Min age">
              <NumberInput name="minAge" defaultValue={game.minAge || parseFirstNumber(game.age)} />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Taxonomía y editoriales</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Categories">
              <textarea className="field-textarea min-h-28" name="categories" defaultValue={game.categories.join("\n")} />
            </Field>
            <Field label="Mechanics">
              <textarea className="field-textarea min-h-28" name="mechanics" defaultValue={game.mechanics.join("\n")} />
            </Field>
            <Field label="Publisher">
              <input className="field-input" name="publisher" defaultValue={game.publisher || ""} />
            </Field>
            <Field label="Spanish publisher">
              <input className="field-input" name="spanishPublisher" defaultValue={game.spanishPublisher || ""} />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Contenido editorial</h2>
          <div className="mt-5 space-y-4">
            <Field label="Short description">
              <textarea className="field-textarea min-h-24" name="shortDescription" defaultValue={game.shortDescription || game.shortSummary || ""} />
            </Field>
            <Field label="Description">
              <textarea className="field-textarea min-h-40" name="description" defaultValue={game.description || ""} />
            </Field>
            <Field label="Quick verdict">
              <textarea className="field-textarea min-h-28" name="quickVerdict" defaultValue={game.quickVerdict || game.review || ""} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Best for">
                <textarea className="field-textarea min-h-28" name="bestFor" defaultValue={game.bestFor || ""} />
              </Field>
              <Field label="Not for">
                <textarea className="field-textarea min-h-28" name="notFor" defaultValue={game.notFor || ""} />
              </Field>
            </div>
          </div>
        </section>

        <section className="grid gap-5 rounded-md border border-ink/10 bg-white p-5 shadow-soft lg:grid-cols-2">
          <Field label="Pros">
            <textarea className="field-textarea min-h-32" name="pros" defaultValue={game.pros.join("\n")} />
          </Field>
          <Field label="Cons">
            <textarea className="field-textarea min-h-32" name="cons" defaultValue={game.cons.join("\n")} />
          </Field>
          <Field label="FAQ (Pregunta | Respuesta)">
            <textarea className="field-textarea min-h-40" name="faq" defaultValue={faq.map((item) => `${item.question} | ${item.answer}`).join("\n")} />
          </Field>
          <div className="space-y-4">
            <Field label="SEO title">
              <input className="field-input" name="seoTitle" defaultValue={game.seoTitle || ""} />
            </Field>
            <Field label="SEO description">
              <textarea className="field-textarea min-h-24" name="seoDescription" defaultValue={game.seoDescription || ""} />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Imagen pública</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Primary image id">
              <input className="field-input" name="primaryImageId" list="media-assets" defaultValue={game.primaryImageId || ""} />
              <datalist id="media-assets">
                {mediaAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.type} · {asset.url}
                  </option>
                ))}
              </datalist>
            </Field>
            <label className="mt-7 flex items-center gap-2 rounded-md bg-ink/5 px-3 py-2 text-sm font-semibold text-ink/70">
              <input name="imageFallbackAccepted" type="checkbox" defaultChecked={game.imageFallbackAccepted} />
              Aceptar fallback de imagen
            </label>
          </div>
        </section>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function NumberInput({ name, defaultValue }: { name: string; defaultValue: number | null | undefined }) {
  return <input className="field-input" name={name} type="number" min="1" defaultValue={defaultValue || ""} />;
}

function Feedback({ state }: { state: GameEditorActionState }) {
  if (state.errors?.length) {
    return (
      <div className="rounded-md border border-ruby/20 bg-ruby/10 px-4 py-3 text-sm font-semibold text-ruby">
        <p>No se puede publicar todavía:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (state.message) {
    return <p className="rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">{state.message}</p>;
  }

  return null;
}

function parsePlaytime(value: string | null) {
  const numbers = value ? [...value.matchAll(/\d+/g)].map((match) => Number(match[0])) : [];

  return {
    min: numbers[0] || null,
    max: numbers[1] || numbers[0] || null
  };
}

function parseFirstNumber(value: string | null) {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : null;
}
