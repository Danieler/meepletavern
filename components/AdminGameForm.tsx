"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ExternalLink, Rocket, Save, Trash2 } from "lucide-react";
import { getAdminApiFetchHeaders, getAdminApiRequestHeaders } from "@/lib/adminApiClient";
import { EditableList } from "@/components/EditableList";
import type { FaqItem, SourceItem } from "@/lib/content";

type AdminGameStatus = "draft" | "review" | "published" | "archived";
type AdminGameImageStatus = "verified" | "missing" | "placeholder" | "needs_review";

export type AdminGameFormValues = {
  id: string;
  name: string;
  slug: string;
  status: AdminGameStatus;
  imageUrl: string;
  coverImageUrl: string;
  coverImageAlt: string;
  imageSourceName: string;
  imageSourceUrl: string;
  imageLicenseNote: string;
  imageStatus: AdminGameImageStatus;
  description: string;
  review: string;
  shortSummary: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  notFor: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  playtime: string;
  age: string;
  complexity: string;
  categories: string[];
  mechanics: string[];
  themes: string[];
  similarGames: string[];
  faqs: FaqItem[];
  seoTitle: string;
  seoDescription: string;
  buyUrl: string;
  sources: SourceItem[];
};

type AdminGameFormProps = {
  initialGame: AdminGameFormValues;
};

type SaveMode = "draft" | "current" | "publish" | "archive";

export function AdminGameForm({ initialGame }: AdminGameFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialGame);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverPreviewError, setCoverPreviewError] = useState(false);

  const publicUrl = useMemo(
    () => (form.status === "published" ? `/juegos/${form.slug}` : null),
    [form.slug, form.status]
  );

  function updateField<K extends keyof AdminGameFormValues>(key: K, value: AdminGameFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "coverImageUrl") {
      setCoverPreviewError(false);
    }
  }

  async function save(mode: SaveMode) {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const status =
        mode === "draft" ? "draft" : mode === "archive" ? "archived" : mode === "publish" ? form.status : form.status;

      const response = await fetch(`/api/admin/games/${form.id}`, {
        method: "PATCH",
        headers: getAdminApiFetchHeaders(),
        body: JSON.stringify({ ...form, status })
      });
      const payload = (await response.json()) as { error?: string; slug?: string; status?: AdminGameStatus };

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo guardar.");
      }

      let nextStatus = payload.status || status;
      let nextSlug = payload.slug || form.slug;

      if (mode === "publish" || mode === "archive") {
        const action = mode === "publish" ? "publish" : "archive";
        const actionResponse = await fetch(`/api/admin/games/${form.id}/${action}`, {
          method: "POST",
          headers: getAdminApiRequestHeaders()
        });
        const actionPayload = (await actionResponse.json()) as {
          error?: string;
          slug?: string;
          status?: AdminGameStatus;
        };

        if (!actionResponse.ok) {
          throw new Error(actionPayload.error || "No se pudo cambiar el estado.");
        }

        nextStatus = actionPayload.status || nextStatus;
        nextSlug = actionPayload.slug || nextSlug;
      }

      setForm((current) => ({ ...current, status: nextStatus, slug: nextSlug }));
      setMessage(
        mode === "publish"
          ? "Ficha publicada."
          : mode === "archive"
            ? "Ficha archivada."
            : "Borrador guardado."
      );
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-md border border-ink/10 bg-white p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink/55">Estado actual</p>
          <p className="mt-1 text-xl font-bold text-ink">{statusLabel(form.status)}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="button-secondary" onClick={() => save("draft")} disabled={isSaving}>
            <Save size={18} aria-hidden="true" />
            Guardar borrador
          </button>
          <button type="button" className="button-primary" onClick={() => save("publish")} disabled={isSaving}>
            <Rocket size={18} aria-hidden="true" />
            Publicar
          </button>
          <button type="button" className="button-danger" onClick={() => save("archive")} disabled={isSaving}>
            <Archive size={18} aria-hidden="true" />
            Archivar
          </button>
          {publicUrl ? (
            <a className="button-secondary" href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={18} aria-hidden="true" />
              Ver pública
            </a>
          ) : null}
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-ruby/20 bg-ruby/10 px-3 py-2 text-sm font-semibold text-ruby">
          {error}
        </p>
      ) : null}

      <form className="space-y-6">
        <section id="contenido-editorial" className="scroll-mt-24 rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Datos principales</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Nombre del juego">
              <input className="field-input" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            </Field>
            <Field label="Slug">
              <input className="field-input" value={form.slug} onChange={(event) => updateField("slug", event.target.value)} />
            </Field>
            <Field label="Estado">
              <select
                className="field-input"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as AdminGameStatus)}
              >
                <option value="draft">draft</option>
                <option value="review">review</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </Field>
            <Field label="Jugadores mínimos">
              <NumberInput value={form.minPlayers} onChange={(value) => updateField("minPlayers", value)} />
            </Field>
            <Field label="Jugadores máximos">
              <NumberInput value={form.maxPlayers} onChange={(value) => updateField("maxPlayers", value)} />
            </Field>
            <Field label="Duración aproximada">
              <input className="field-input" value={form.playtime} onChange={(event) => updateField("playtime", event.target.value)} />
            </Field>
            <Field label="Edad recomendada">
              <input className="field-input" value={form.age} onChange={(event) => updateField("age", event.target.value)} />
            </Field>
            <Field label="Complejidad">
              <input className="field-input" value={form.complexity} onChange={(event) => updateField("complexity", event.target.value)} />
            </Field>
            <Field label="Enlace de compra">
              <input className="field-input" value={form.buyUrl} onChange={(event) => updateField("buyUrl", event.target.value)} />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Portada</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4 md:grid-cols-2">
            <Field label="Estado de imagen">
              <select
                className="field-input"
                value={form.imageStatus}
                onChange={(event) => updateField("imageStatus", event.target.value as AdminGameImageStatus)}
              >
                <option value="missing">missing</option>
                <option value="placeholder">placeholder</option>
                <option value="needs_review">needs_review</option>
                <option value="verified">verified</option>
              </select>
            </Field>
            <Field label="URL portada verificada">
              <input
                className="field-input"
                value={form.coverImageUrl}
                onChange={(event) => updateField("coverImageUrl", event.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Texto alternativo">
              <input
                className="field-input"
                value={form.coverImageAlt}
                onChange={(event) => updateField("coverImageAlt", event.target.value)}
              />
            </Field>
            <Field label="Nombre de la fuente">
              <input
                className="field-input"
                value={form.imageSourceName}
                onChange={(event) => updateField("imageSourceName", event.target.value)}
              />
            </Field>
            <Field label="URL de la fuente">
              <input
                className="field-input"
                value={form.imageSourceUrl}
                onChange={(event) => updateField("imageSourceUrl", event.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Licencia / nota">
              <input
                className="field-input"
                value={form.imageLicenseNote}
                onChange={(event) => updateField("imageLicenseNote", event.target.value)}
              />
            </Field>
          </div>
            <div className="rounded-md border border-ink/10 bg-ink/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Vista previa</p>
              <div className="mt-3 overflow-hidden rounded-md border border-ink/10 bg-white">
                {form.coverImageUrl && !coverPreviewError ? (
                  <img
                    src={form.coverImageUrl}
                    alt={form.coverImageAlt || form.name}
                    className="aspect-[4/3] w-full object-cover"
                    onError={() => setCoverPreviewError(true)}
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-parchment px-4 text-center text-sm font-semibold text-ink/55">
                    {form.coverImageUrl ? "La imagen no carga en este momento." : "Todavía no hay URL de portada."}
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-ink/55">
                Esta vista previa cambia al instante al editar la URL. El estado de publicación sigue
                dependiendo de la validación editorial.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Contenido editorial</h2>
          <div className="mt-5 space-y-4">
            <Field label="Resumen rápido">
              <textarea
                className="field-textarea min-h-24"
                value={form.shortSummary}
                onChange={(event) => updateField("shortSummary", event.target.value)}
              />
            </Field>
            <Field label="Descripción">
              <textarea className="field-textarea" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
            </Field>
            <Field label="Reseña corta">
              <textarea className="field-textarea" value={form.review} onChange={(event) => updateField("review", event.target.value)} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Para quién es">
                <textarea className="field-textarea" value={form.bestFor} onChange={(event) => updateField("bestFor", event.target.value)} />
              </Field>
              <Field label="Para quién no es">
                <textarea className="field-textarea" value={form.notFor} onChange={(event) => updateField("notFor", event.target.value)} />
              </Field>
            </div>
          </div>
        </section>

        <section id="taxonomia" className="grid scroll-mt-24 gap-5 rounded-md border border-ink/10 bg-white p-5 shadow-soft lg:grid-cols-2">
          <EditableList label="Pros" values={form.pros} onChange={(values) => updateField("pros", values)} />
          <EditableList label="Contras" values={form.cons} onChange={(values) => updateField("cons", values)} />
          <EditableList label="Categorías" values={form.categories} onChange={(values) => updateField("categories", values)} />
          <EditableList label="Mecánicas" values={form.mechanics} onChange={(values) => updateField("mechanics", values)} />
          <EditableList label="Taberna / temáticas" values={form.themes} onChange={(values) => updateField("themes", values)} />
          <EditableList
            label="Juegos parecidos"
            values={form.similarGames}
            onChange={(values) => updateField("similarGames", values)}
          />
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-ink">FAQs SEO</h2>
            <button
              type="button"
              className="button-secondary min-h-9 px-3 py-1.5"
              onClick={() => updateField("faqs", [...form.faqs, { question: "", answer: "" }])}
            >
              Añadir
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {form.faqs.map((faq, index) => (
              <div key={index} className="rounded-md border border-ink/10 p-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    aria-label="Borrar FAQ"
                    className="button-secondary min-h-9 w-9 px-0"
                    onClick={() => updateField("faqs", form.faqs.filter((_, currentIndex) => currentIndex !== index))}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-3 grid gap-3">
                  <input
                    className="field-input"
                    value={faq.question}
                    placeholder="Pregunta"
                    onChange={(event) => updateFaq(index, "question", event.target.value)}
                  />
                  <textarea
                    className="field-textarea min-h-24"
                    value={faq.answer}
                    placeholder="Respuesta"
                    onChange={(event) => updateFaq(index, "answer", event.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">SEO y fuentes</h2>
          <div className="mt-5 space-y-4">
            <Field label="Meta title">
              <input className="field-input" value={form.seoTitle} onChange={(event) => updateField("seoTitle", event.target.value)} />
            </Field>
            <Field label="Meta description">
              <textarea
                className="field-textarea min-h-24"
                value={form.seoDescription}
                onChange={(event) => updateField("seoDescription", event.target.value)}
              />
            </Field>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="field-label">Fuentes</h3>
                <button
                  type="button"
                  className="button-secondary min-h-9 px-3 py-1.5"
                  onClick={() => updateField("sources", [...form.sources, { label: "", url: "" }])}
                >
                  Añadir
                </button>
              </div>
              {form.sources.map((source, index) => (
                <div key={index} className="grid gap-2 rounded-md border border-ink/10 p-4 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    className="field-input"
                    value={source.label}
                    placeholder="Nombre"
                    onChange={(event) => updateSource(index, "label", event.target.value)}
                  />
                  <input
                    className="field-input"
                    value={source.url || ""}
                    placeholder="URL"
                    onChange={(event) => updateSource(index, "url", event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label="Borrar fuente"
                    className="button-secondary min-h-11 w-11 px-0"
                    onClick={() =>
                      updateField(
                        "sources",
                        form.sources.filter((_, currentIndex) => currentIndex !== index)
                      )
                    }
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </form>
    </div>
  );

  function updateFaq(index: number, key: keyof FaqItem, value: string) {
    updateField(
      "faqs",
      form.faqs.map((faq, currentIndex) => (currentIndex === index ? { ...faq, [key]: value } : faq))
    );
  }

  function updateSource(index: number, key: keyof SourceItem, value: string) {
    updateField(
      "sources",
      form.sources.map((source, currentIndex) =>
        currentIndex === index ? { ...source, [key]: value } : source
      )
    );
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <input
      type="number"
      min={1}
      className="field-input"
      value={value ?? ""}
      onChange={(event) => {
        const nextValue = event.target.value ? Number.parseInt(event.target.value, 10) : null;
        onChange(nextValue === null || Number.isFinite(nextValue) ? nextValue : null);
      }}
    />
  );
}

function statusLabel(status: AdminGameStatus) {
  const labels = {
    draft: "Borrador",
    review: "En revisión",
    published: "Publicado",
    archived: "Archivado"
  };

  return labels[status];
}
