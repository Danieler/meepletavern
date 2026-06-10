"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GameStatus, type Game, type MediaAsset } from "@prisma/client";
import { ExternalLink, RefreshCcw, Rocket, Save, Trash2, WandSparkles } from "lucide-react";
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

export function AdminFinalGameForm({ game, mediaAssets }: AdminFinalGameFormProps) {
  const router = useRouter();
  const [saveState, saveAction, isSaving] = useActionState(saveGameEditorAction, initialState);
  const [publishState, publishAction, isPublishing] = useActionState(publishGameEditorAction, initialState);
  const [aiCompletionState, setAiCompletionState] = useState<AiCompletionState>({});
  const [isCompletingWithAi, setIsCompletingWithAi] = useState(false);
  const [externalRatingState, setExternalRatingState] = useState<AiCompletionState>({});
  const [isRecalculatingExternalRating, setIsRecalculatingExternalRating] = useState(false);
  const [primaryImageValue, setPrimaryImageValue] = useState(game.primaryImageId || "");
  const ratings = useMemo(() => normalizeGameRatings(game.ratings), [game.ratings]);
  const externalRating = ratings.external;
  const players = normalizeGamePlayers(game.players);
  const playtime = parsePlaytime(game.playtime);
  const faq = normalizeGameFaq(game.faq || game.faqs);
  const publicUrl = game.status === GameStatus.published ? `/juegos/${game.slug}` : null;
  const showPublishButton = game.status !== GameStatus.published;
  const primaryImagePreviewUrl = useMemo(
    () => resolvePrimaryImagePreviewUrl(primaryImageValue, game, mediaAssets),
    [game, mediaAssets, primaryImageValue]
  );
  const isBusy = isSaving || isPublishing || isCompletingWithAi || isRecalculatingExternalRating;

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
    setExternalRatingState({});
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

  async function handleRecalculateExternalRating() {
    setIsRecalculatingExternalRating(true);
    setAiCompletionState({});
    setExternalRatingState({});

    try {
      const response = await fetch(`/api/admin/games/${game.id}/recalculate-external-rating`, {
        method: "POST",
        headers: getAdminApiFetchHeaders()
      });
      const payload = (await response.json()) as {
        error?: string;
        warnings?: string[];
      };

      if (!response.ok) {
        setExternalRatingState({
          errors: [payload.error || "No se pudo recalcular el consenso externo."]
        });
        return;
      }

      setExternalRatingState({
        message: "Consenso externo recalculado.",
        warnings: payload.warnings || []
      });
      router.refresh();
    } catch (error) {
      setExternalRatingState({
        errors: [error instanceof Error ? error.message : "No se pudo recalcular el consenso externo."]
      });
    } finally {
      setIsRecalculatingExternalRating(false);
    }
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
            <button className="button-secondary" type="button" onClick={handleRecalculateExternalRating} disabled={isBusy || isRecalculatingExternalRating}>
              <RefreshCcw size={18} aria-hidden="true" />
              {isRecalculatingExternalRating ? "Recalculando..." : "Recalcular consenso externo"}
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
            <p className="text-sm font-semibold text-ink/55">Consenso externo</p>
            <h2 className="mt-1 text-xl font-bold text-ink">
              {externalRating?.score !== undefined ? `${externalRating.score.toFixed(1)}/10 · ${externalRating.label}` : "Sin datos suficientes"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
              {externalRating?.explanation ||
                "Todavía no hay puntuaciones externas suficientes para calcular una media útil. Puedes recalcularlo cuando haya más datos."}
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
      <Feedback state={externalRatingState} errorTitle="No se pudo recalcular el consenso externo:" />
      <Feedback state={saveState} errorTitle="No se pudo guardar:" />
      <Feedback state={publishState} errorTitle="No se pudo publicar:" />

      <form id="final-game-form" className="space-y-6">
        <input type="hidden" name="id" value={game.id} />
        <input type="hidden" name="status" value={game.status} />

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Datos principales</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Título">
              <input className="field-input" name="title" required defaultValue={game.title || game.name} />
            </Field>
            <Field label="Identificador URL">
              <input className="field-input" name="slug" required defaultValue={game.slug} />
            </Field>
            <Field label="Título original">
              <input className="field-input" name="originalTitle" defaultValue={game.originalTitle || ""} />
            </Field>
            <Field label="Año">
              <input className="field-input" name="year" type="number" min="1" defaultValue={game.year || ""} />
            </Field>
            <Field label="Dificultad">
              <input className="field-input" name="difficulty" defaultValue={game.difficulty || game.complexity || ""} />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Mesa</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Jugadores mínimos">
              <NumberInput name="minPlayers" defaultValue={players.min ?? game.minPlayers} />
            </Field>
            <Field label="Jugadores máximos">
              <NumberInput name="maxPlayers" defaultValue={players.max ?? game.maxPlayers} />
            </Field>
            <Field label="Jugadores ideales">
              <NumberInput name="idealPlayers" defaultValue={players.ideal ?? null} />
            </Field>
            <Field label="Duración mínima">
              <NumberInput name="minPlayTime" defaultValue={playtime.min} />
            </Field>
            <Field label="Duración máxima">
              <NumberInput name="maxPlayTime" defaultValue={playtime.max} />
            </Field>
            <Field label="Edad mínima">
              <NumberInput name="minAge" defaultValue={game.minAge || parseFirstNumber(game.age)} />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Taxonomía y editoriales</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Categorías">
              <textarea className="field-textarea min-h-28" name="categories" defaultValue={game.categories.join("\n")} />
            </Field>
            <Field label="Mecánicas">
              <textarea className="field-textarea min-h-28" name="mechanics" defaultValue={game.mechanics.join("\n")} />
            </Field>
            <Field label="Temáticas">
              <textarea className="field-textarea min-h-28" name="themes" defaultValue={game.themes.join("\n")} />
            </Field>
            <Field label="Editorial">
              <input className="field-input" name="publisher" defaultValue={game.publisher || ""} />
            </Field>
            <Field label="Editorial en España">
              <input className="field-input" name="spanishPublisher" defaultValue={game.spanishPublisher || ""} />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Contenido editorial</h2>
          <div className="mt-5 space-y-4">
            <Field label="Descripción breve">
              <textarea className="field-textarea min-h-24" name="shortDescription" defaultValue={game.shortDescription || game.shortSummary || ""} />
            </Field>
            <Field label="Descripción">
              <textarea className="field-textarea min-h-40" name="description" defaultValue={game.description || ""} />
            </Field>
            <Field label="Veredicto rápido">
              <textarea className="field-textarea min-h-28" name="quickVerdict" defaultValue={game.quickVerdict || game.review || ""} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ideal para">
                <textarea className="field-textarea min-h-28" name="bestFor" defaultValue={game.bestFor || ""} />
              </Field>
              <Field label="No recomendado para">
                <textarea className="field-textarea min-h-28" name="notFor" defaultValue={game.notFor || ""} />
              </Field>
            </div>
          </div>
        </section>

        <section className="grid gap-5 rounded-md border border-ink/10 bg-white p-5 shadow-soft lg:grid-cols-2">
          <Field label="Puntos a favor">
            <textarea className="field-textarea min-h-32" name="pros" defaultValue={game.pros.join("\n")} />
          </Field>
          <Field label="Puntos en contra">
            <textarea className="field-textarea min-h-32" name="cons" defaultValue={game.cons.join("\n")} />
          </Field>
          <Field label="FAQ (Pregunta | Respuesta)">
            <textarea className="field-textarea min-h-40" name="faq" defaultValue={faq.map((item) => `${item.question} | ${item.answer}`).join("\n")} />
          </Field>
          <div className="space-y-4">
            <Field label="Título SEO">
              <input className="field-input" name="seoTitle" defaultValue={game.seoTitle || ""} />
            </Field>
            <Field label="Descripción SEO">
              <textarea className="field-textarea min-h-24" name="seoDescription" defaultValue={game.seoDescription || ""} />
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
                  value={primaryImageValue}
                  onChange={(event) => setPrimaryImageValue(event.target.value)}
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
                <input name="imageFallbackAccepted" type="checkbox" defaultChecked={game.imageFallbackAccepted} />
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

function NumberInput({ name, defaultValue }: { name: string; defaultValue: number | null | undefined }) {
  return <input className="field-input" name={name} type="number" min="1" defaultValue={defaultValue || ""} />;
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
