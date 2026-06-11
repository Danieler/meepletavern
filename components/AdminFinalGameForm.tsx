"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GameStatus, type Game, type MediaAsset } from "@prisma/client";
import { ExternalLink, Rocket, Save, Trash2, WandSparkles } from "lucide-react";
import {
  deleteGameEditorAction,
  publishGameEditorAction,
  saveGameEditorAction,
  type GameEditorActionState
} from "@/app/admin/games/[id]/actions";
import { AdminStatusBadge } from "@/components/AdminStatusBadge";
import { RatingBadge } from "@/components/RatingBadge";
import { getAdminApiFetchHeaders } from "@/lib/adminApiClient";
import { normalizeGameFaq, normalizeGamePlayers } from "@/lib/editorialMappers";
import { normalizeGameRatings } from "@/lib/ratings/gameRatings";

type AdminFinalGameFormProps = {
  game: Game;
  mediaAssets: MediaAsset[];
};

const initialState: GameEditorActionState = {};
type AiCompletionState = GameEditorActionState & {
  suggestedTitle?: string | null;
};

type EditorDraftValues = {
  title: string;
  slug: string;
  originalTitle: string;
  year: string;
  difficulty: string;
  minPlayers: string;
  maxPlayers: string;
  idealPlayers: string;
  minPlayTime: string;
  maxPlayTime: string;
  minAge: string;
  categories: string;
  mechanics: string;
  themes: string;
  publisher: string;
  spanishPublisher: string;
  shortDescription: string;
  description: string;
  quickVerdict: string;
  bestFor: string;
  notFor: string;
  pros: string;
  cons: string;
  faq: string;
  seoTitle: string;
  seoDescription: string;
  primaryImageId: string;
  imageFallbackAccepted: boolean;
};

export function AdminFinalGameForm({ game, mediaAssets }: AdminFinalGameFormProps) {
  const router = useRouter();
  const [saveState, saveAction, isSaving] = useActionState(saveGameEditorAction, initialState);
  const [publishState, publishAction, isPublishing] = useActionState(publishGameEditorAction, initialState);
  const [aiCompletionState, setAiCompletionState] = useState<AiCompletionState>({});
  const [isCompletingWithAi, setIsCompletingWithAi] = useState(false);
  const ratings = useMemo(() => normalizeGameRatings(game.ratings), [game.ratings]);
  const externalRating = ratings.external;
  const players = normalizeGamePlayers(game.players);
  const playtime = parsePlaytime(game.playtime);
  const faq = normalizeGameFaq(game.faq || game.faqs);
  const initialDraftValues = useMemo(
    () =>
      buildDraftValues(
        game,
        normalizeGamePlayers(game.players),
        parsePlaytime(game.playtime),
        normalizeGameFaq(game.faq || game.faqs)
      ),
    [game]
  );
  const [draftValues, setDraftValues] = useState<EditorDraftValues>(() =>
    initialDraftValues
  );
  const publicUrl = game.status === GameStatus.published ? `/juegos/${game.slug}` : null;
  const showPublishButton = game.status !== GameStatus.published;
  const primaryImagePreviewUrl = useMemo(
    () => resolvePrimaryImagePreviewUrl(draftValues.primaryImageId, game, mediaAssets),
    [draftValues.primaryImageId, game, mediaAssets]
  );
  const isBusy = isSaving || isPublishing || isCompletingWithAi;

  useEffect(() => {
    setDraftValues(initialDraftValues);
  }, [initialDraftValues]);

  useEffect(() => {
    if (saveState.message && !saveState.errors?.length) {
      router.refresh();
    }
  }, [router, saveState]);

  useEffect(() => {
    if (publishState.message && !publishState.errors?.length) {
      router.refresh();
    }
  }, [router, publishState]);

  async function handleAiCompletion() {
    setIsCompletingWithAi(true);
    setAiCompletionState({});

    try {
      const response = await fetch(`/api/admin/games/${game.id}/complete-editorial`, {
        method: "POST",
        headers: getAdminApiFetchHeaders()
      });
      const payload = (await response.json()) as {
        error?: string;
        appliedFields?: string[];
        warnings?: string[];
        suggestedTitle?: string | null;
      };

      if (!response.ok) {
        setAiCompletionState({
          errors: [payload.error || "No se pudieron completar los campos editoriales con IA."]
        });
        return;
      }

      setAiCompletionState({
        message: payload.appliedFields?.length
          ? "Campos editoriales completados con IA. Revisa la ficha antes de publicar."
          : "La IA respondió, pero no se aplicaron cambios porque la ficha ya tenía contenido válido o mejor que la propuesta.",
        warnings: payload.warnings || [],
        suggestedTitle: payload.suggestedTitle || null
      });

      if (payload.appliedFields?.length) {
        router.refresh();
      }
    } catch (error) {
      setAiCompletionState({
        errors: [error instanceof Error ? error.message : "No se pudieron completar los campos editoriales con IA."]
      });
    } finally {
      setIsCompletingWithAi(false);
    }
  }

  function updateDraftField<K extends keyof EditorDraftValues>(key: K, value: EditorDraftValues[K]) {
    setDraftValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-ink/10 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink/55">Estado actual</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <AdminStatusBadge status={game.status} />
              <p className="text-sm leading-6 text-ink/60">
                {game.status === GameStatus.published
                  ? "Guardar cambios mantiene la ficha publicada."
                  : "El estado se gestiona con los botones, no hace falta cambiarlo a mano."}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="button-secondary" type="button" onClick={handleAiCompletion} disabled={isBusy}>
              <WandSparkles size={18} aria-hidden="true" />
              {isCompletingWithAi ? "Generando..." : "Generar descripción en español"}
            </button>
            <button className="button-secondary" form="final-game-form" formAction={saveAction} disabled={isBusy}>
              <Save size={18} aria-hidden="true" />
              Guardar cambios
            </button>
            {showPublishButton ? (
              <button className="button-primary" form="final-game-form" formAction={publishAction} disabled={isBusy}>
                <Rocket size={18} aria-hidden="true" />
                Publicar
              </button>
            ) : null}
            {publicUrl ? (
              <a className="button-secondary" href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={18} aria-hidden="true" />
                Ver pública
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink/55">Consenso estándar</p>
            <h2 className="mt-1 text-xl font-bold text-ink">
              {externalRating?.score !== undefined ? `${externalRating.score.toFixed(1)}/10 · ${externalRating.label}` : "Sin datos suficientes"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
              {externalRating?.explanation ||
                "Todavía no hay puntuaciones externas suficientes para calcular una media útil. Se actualiza al guardar o publicar la ficha."}
            </p>
          </div>

          {externalRating?.score !== undefined ? (
            <div className="flex items-center gap-3 rounded-md border border-ink/10 bg-parchment/30 px-3 py-3">
              <RatingBadge rating={externalRating.score} size="lg" label="CE" />
              <div className="text-sm text-ink/65">
                <p className="font-semibold text-ink">
                  Confianza: <span className="capitalize">{confidenceLabel(externalRating.confidence)}</span>
                </p>
                <p>{externalRating.sourcesCount} puntuaciones detectadas</p>
                <p>Actualizado el {formatDate(externalRating.lastCheckedAt)}</p>
              </div>
            </div>
          ) : null}
        </div>

        {externalRating?.signals?.length ? (
          <details className="mt-4 rounded-md border border-ink/10 bg-ink/5 px-4 py-3">
            <summary className="cursor-pointer text-sm font-bold text-ink">Ver puntuaciones usadas</summary>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {externalRating.signals.map((signal) => (
                <div key={`${signal.sourceName}-${signal.sourceType}-${signal.url || signal.matchedTitle || "signal"}`} className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink">{signal.sourceName}</p>
                      <p className="text-xs font-semibold text-ink/55">{externalSignalTypeLabel(signal.sourceType)}</p>
                    </div>
                    <span className="rounded-full bg-ink/5 px-2 py-1 text-xs font-bold text-ink/70">
                      {signal.score !== undefined ? `${signal.score.toFixed(1)}/10` : "Sin nota"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-ink/60">
                    {signal.reviewCount ? `${signal.reviewCount} reseñas · ` : ""}
                    confianza {confidenceLabel(signal.confidence)}
                    {signal.sourceType === "store_service_rating" ? " · no entra en la media" : ""}
                    {signal.isExactMatch === false ? " · coincidencia dudosa" : ""}
                  </p>
                  {signal.url ? (
                    <a className="mt-2 inline-flex text-xs font-semibold text-moss" href={signal.url} target="_blank" rel="noreferrer">
                      Abrir fuente
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      <Feedback state={aiCompletionState} errorTitle="No se pudo completar con IA:" />
      {aiCompletionState.suggestedTitle ? <SuggestedTitleNotice title={aiCompletionState.suggestedTitle} /> : null}
      <Feedback state={saveState} errorTitle="No se pudo guardar:" />
      <Feedback state={publishState} errorTitle="No se pudo publicar:" />

      <form id="final-game-form" className="space-y-6">
        <input type="hidden" name="id" value={game.id} />
        <input type="hidden" name="status" value={game.status} />

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Datos principales</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Título">
              <input
                className="field-input"
                name="title"
                required
                value={draftValues.title}
                onChange={(event) => updateDraftField("title", event.target.value)}
              />
            </Field>
            <Field label="Identificador URL">
              <input
                className="field-input"
                name="slug"
                required
                value={draftValues.slug}
                onChange={(event) => updateDraftField("slug", event.target.value)}
              />
            </Field>
            <Field label="Título original">
              <input
                className="field-input"
                name="originalTitle"
                value={draftValues.originalTitle}
                onChange={(event) => updateDraftField("originalTitle", event.target.value)}
              />
            </Field>
            <Field label="Año">
              <input
                className="field-input"
                name="year"
                type="number"
                min="1"
                value={draftValues.year}
                onChange={(event) => updateDraftField("year", event.target.value)}
              />
            </Field>
            <Field label="Dificultad">
              <input
                className="field-input"
                name="difficulty"
                value={draftValues.difficulty}
                onChange={(event) => updateDraftField("difficulty", event.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Mesa</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Jugadores mínimos">
              <NumberInput
                name="minPlayers"
                value={draftValues.minPlayers}
                onChange={(value) => updateDraftField("minPlayers", value)}
              />
            </Field>
            <Field label="Jugadores máximos">
              <NumberInput
                name="maxPlayers"
                value={draftValues.maxPlayers}
                onChange={(value) => updateDraftField("maxPlayers", value)}
              />
            </Field>
            <Field label="Jugadores ideales">
              <NumberInput
                name="idealPlayers"
                value={draftValues.idealPlayers}
                onChange={(value) => updateDraftField("idealPlayers", value)}
              />
            </Field>
            <Field label="Duración mínima">
              <NumberInput
                name="minPlayTime"
                value={draftValues.minPlayTime}
                onChange={(value) => updateDraftField("minPlayTime", value)}
              />
            </Field>
            <Field label="Duración máxima">
              <NumberInput
                name="maxPlayTime"
                value={draftValues.maxPlayTime}
                onChange={(value) => updateDraftField("maxPlayTime", value)}
              />
            </Field>
            <Field label="Edad mínima">
              <NumberInput
                name="minAge"
                value={draftValues.minAge}
                onChange={(value) => updateDraftField("minAge", value)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Taxonomía y editoriales</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Categorías">
              <textarea
                className="field-textarea min-h-28"
                name="categories"
                value={draftValues.categories}
                onChange={(event) => updateDraftField("categories", event.target.value)}
              />
            </Field>
            <Field label="Mecánicas">
              <textarea
                className="field-textarea min-h-28"
                name="mechanics"
                value={draftValues.mechanics}
                onChange={(event) => updateDraftField("mechanics", event.target.value)}
              />
            </Field>
            <Field label="Temáticas">
              <textarea
                className="field-textarea min-h-28"
                name="themes"
                value={draftValues.themes}
                onChange={(event) => updateDraftField("themes", event.target.value)}
              />
            </Field>
            <Field label="Editorial">
              <input
                className="field-input"
                name="publisher"
                value={draftValues.publisher}
                onChange={(event) => updateDraftField("publisher", event.target.value)}
              />
            </Field>
            <Field label="Editorial en España">
              <input
                className="field-input"
                name="spanishPublisher"
                value={draftValues.spanishPublisher}
                onChange={(event) => updateDraftField("spanishPublisher", event.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Contenido editorial</h2>
          <div className="mt-5 space-y-4">
            <Field label="Descripción breve">
              <textarea
                className="field-textarea min-h-24"
                name="shortDescription"
                value={draftValues.shortDescription}
                onChange={(event) => updateDraftField("shortDescription", event.target.value)}
              />
            </Field>
            <Field label="Descripción">
              <textarea
                className="field-textarea min-h-40"
                name="description"
                value={draftValues.description}
                onChange={(event) => updateDraftField("description", event.target.value)}
              />
            </Field>
            <Field label="Veredicto rápido">
              <textarea
                className="field-textarea min-h-28"
                name="quickVerdict"
                value={draftValues.quickVerdict}
                onChange={(event) => updateDraftField("quickVerdict", event.target.value)}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ideal para">
                <textarea
                  className="field-textarea min-h-28"
                  name="bestFor"
                  value={draftValues.bestFor}
                  onChange={(event) => updateDraftField("bestFor", event.target.value)}
                />
              </Field>
              <Field label="No recomendado para">
                <textarea
                  className="field-textarea min-h-28"
                  name="notFor"
                  value={draftValues.notFor}
                  onChange={(event) => updateDraftField("notFor", event.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="grid gap-5 rounded-md border border-ink/10 bg-white p-5 shadow-soft lg:grid-cols-2">
          <Field label="Puntos a favor">
            <textarea
              className="field-textarea min-h-32"
              name="pros"
              value={draftValues.pros}
              onChange={(event) => updateDraftField("pros", event.target.value)}
            />
          </Field>
          <Field label="Puntos en contra">
            <textarea
              className="field-textarea min-h-32"
              name="cons"
              value={draftValues.cons}
              onChange={(event) => updateDraftField("cons", event.target.value)}
            />
          </Field>
          <Field label="FAQ (Pregunta | Respuesta)">
            <textarea
              className="field-textarea min-h-40"
              name="faq"
              value={draftValues.faq}
              onChange={(event) => updateDraftField("faq", event.target.value)}
            />
          </Field>
          <div className="space-y-4">
            <Field label="Título SEO">
              <input
                className="field-input"
                name="seoTitle"
                value={draftValues.seoTitle}
                onChange={(event) => updateDraftField("seoTitle", event.target.value)}
              />
            </Field>
            <Field label="Descripción SEO">
              <textarea
                className="field-textarea min-h-24"
                name="seoDescription"
                value={draftValues.seoDescription}
                onChange={(event) => updateDraftField("seoDescription", event.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Imagen pública</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ID de imagen principal / URL">
                <input
                  className="field-input"
                  name="primaryImageId"
                  list="media-assets"
                  value={draftValues.primaryImageId}
                  onChange={(event) => updateDraftField("primaryImageId", event.target.value)}
                  placeholder="ID de asset o https://..."
                />
                <datalist id="media-assets">
                  {mediaAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.type} · {asset.url}
                    </option>
                  ))}
                </datalist>
              </Field>
              <label className="mt-7 flex items-center gap-2 rounded-md bg-ink/5 px-3 py-2 text-sm font-semibold text-ink/70">
                <input
                  name="imageFallbackAccepted"
                  type="checkbox"
                  checked={draftValues.imageFallbackAccepted}
                  onChange={(event) => updateDraftField("imageFallbackAccepted", event.target.checked)}
                />
                Aceptar fallback de imagen
              </label>
            </div>
            <div className="rounded-md border border-ink/10 bg-ink/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Vista previa</p>
              <div className="mt-3 overflow-hidden rounded-md border border-ink/10 bg-white">
                {primaryImagePreviewUrl ? (
                  <img
                    src={primaryImagePreviewUrl}
                    alt={game.coverImageAlt || game.title || game.name}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-parchment px-4 text-center text-sm font-semibold text-ink/55">
                    No hay portada seleccionada.
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-ink/55">
                Si pegas una URL, la vista previa la usa directamente. Si eliges un MediaAsset, se resuelve
                su URL automáticamente.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-ruby/20 bg-ruby/5 p-5 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">Zona peligrosa</h2>
              <p className="mt-1 text-sm leading-6 text-ink/60">
                Eliminar deja la ficha fuera de la web. Solo úsalo si te has equivocado de verdad.
              </p>
            </div>
            {game.status !== GameStatus.published ? (
              <button
                className="button-danger"
                form="final-game-form"
                formAction={deleteGameEditorAction}
                type="submit"
                disabled={isBusy}
                onClick={(event) => {
                  if (!window.confirm("¿Eliminar este borrador? Esta acción borra el juego y sus assets sueltos.")) {
                    event.preventDefault();
                  }
                }}
              >
                <Trash2 size={18} aria-hidden="true" />
                Eliminar juego
              </button>
            ) : null}
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

function NumberInput({
  name,
  value,
  onChange
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="field-input"
      name={name}
      type="number"
      min="1"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function Feedback({ state, errorTitle }: { state: GameEditorActionState; errorTitle: string }) {
  if (state.errors?.length) {
    return (
      <div className="rounded-md border border-ruby/20 bg-ruby/10 px-4 py-3 text-sm font-semibold text-ruby">
        <p>{errorTitle}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
        {state.warnings?.length ? <WarningList warnings={state.warnings} className="mt-4" /> : null}
      </div>
    );
  }

  if (state.warnings?.length) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-ink">
        <p>{state.message || "Se puede publicar, pero la ficha está incompleta."}</p>
        <WarningList warnings={state.warnings} className="mt-3" />
      </div>
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

function SuggestedTitleNotice({ title }: { title: string }) {
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-ink">
      Revisa el título actual. La IA sugiere usar: <span className="font-black">{title}</span>
    </p>
  );
}

function confidenceLabel(value: "low" | "medium" | "high") {
  if (value === "high") {
    return "alta";
  }

  if (value === "medium") {
    return "media";
  }

  return "baja";
}

function externalSignalTypeLabel(value: string) {
  switch (value) {
    case "product_rating":
      return "Valoración del producto";
    case "editorial_review_score":
      return "Puntuación editorial";
    case "editorial_review_sentiment":
      return "Opinión editorial";
    case "community_sentiment":
      return "Opinión de comunidad";
    case "store_availability":
      return "Disponibilidad";
    case "store_service_rating":
      return "Valoración de tienda";
    default:
      return "Fuente externa";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function WarningList({ warnings, className }: { warnings: string[]; className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm font-black text-ink">Recomendaciones para mejorar la ficha:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-ink/75">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
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

function resolvePrimaryImagePreviewUrl(
  primaryImageValue: string,
  game: Game,
  mediaAssets: MediaAsset[]
) {
  const trimmed = primaryImageValue.trim();

  if (!trimmed) {
    return game.coverImageUrl || game.imageUrl || null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const asset = mediaAssets.find((item) => item.id === trimmed);
  if (asset) {
    return asset.url;
  }

  return game.coverImageUrl || game.imageUrl || null;
}

function buildDraftValues(
  game: Game,
  players: ReturnType<typeof normalizeGamePlayers>,
  playtime: ReturnType<typeof parsePlaytime>,
  faq: ReturnType<typeof normalizeGameFaq>
): EditorDraftValues {
  return {
    title: game.title || game.name,
    slug: game.slug,
    originalTitle: game.originalTitle || "",
    year: game.year ? String(game.year) : "",
    difficulty: game.difficulty || game.complexity || "",
    minPlayers: players.min ? String(players.min) : game.minPlayers ? String(game.minPlayers) : "",
    maxPlayers: players.max ? String(players.max) : game.maxPlayers ? String(game.maxPlayers) : "",
    idealPlayers: players.ideal ? String(players.ideal) : "",
    minPlayTime: playtime.min ? String(playtime.min) : "",
    maxPlayTime: playtime.max ? String(playtime.max) : "",
    minAge: game.minAge ? String(game.minAge) : parseFirstNumber(game.age) ? String(parseFirstNumber(game.age)) : "",
    categories: game.categories.join("\n"),
    mechanics: game.mechanics.join("\n"),
    themes: game.themes.join("\n"),
    publisher: game.publisher || "",
    spanishPublisher: game.spanishPublisher || "",
    shortDescription: game.shortDescription || game.shortSummary || "",
    description: game.description || "",
    quickVerdict: game.quickVerdict || game.review || "",
    bestFor: game.bestFor || "",
    notFor: game.notFor || "",
    pros: game.pros.join("\n"),
    cons: game.cons.join("\n"),
    faq: faq.map((item) => `${item.question} | ${item.answer}`).join("\n"),
    seoTitle: game.seoTitle || "",
    seoDescription: game.seoDescription || "",
    primaryImageId: game.primaryImageId || "",
    imageFallbackAccepted: game.imageFallbackAccepted
  };
}
