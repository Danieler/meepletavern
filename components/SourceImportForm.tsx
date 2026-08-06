"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info, Loader2, Upload } from "lucide-react";
import { useAdminI18n } from "@/lib/adminI18n";

type ImportSource = {
  id: string;
  name: string;
  baseUrl: string;
};

type SourceImportFormProps = {
  sources: ImportSource[];
  initialSourceId?: string;
  initialError?: string;
};

export function SourceImportForm({ sources, initialSourceId = "", initialError = "" }: SourceImportFormProps) {
  const { lang, t } = useAdminI18n();
  const initialSelectedSourceId =
    sources.find((source) => source.id === initialSourceId)?.id || sources[0]?.id || "";
  const [selectedSourceId, setSelectedSourceId] = useState(initialSelectedSourceId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) || sources[0] || null,
    [selectedSourceId, sources]
  );
  const expectsAmazonInput = selectedSource ? isAmazonSource(selectedSource) : false;

  if (!sources.length) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold text-ink">{t("sourceImport.title")}</h2>
        <p className="mt-2 text-sm leading-6 text-ink/60">{t("sourceForm.noSources")}</p>
        <Link className="button-secondary mt-4 w-fit" href="/admin/sources">
          {t("sourceForm.newSource")}
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold uppercase tracking-wide text-ruby">{t("sourceImport.tag")}</p>
        <h2 className="text-xl font-bold text-ink">{t("sourceImport.title")}</h2>
        <p className="text-sm leading-6 text-ink/60">
          {t("sourceImport.description")}
        </p>
      </div>

      <div className="mt-5 rounded-md border border-ink/10 bg-parchment/50 p-4">
        <p className="text-sm font-bold text-ink">{t("sourceImport.autoCreateTitle")}</p>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-ink/70">
          <li>• {t("sourceImport.autoCreate1")}</li>
          <li>• {t("sourceImport.autoCreate2")}</li>
          <li>• {t("sourceImport.autoCreate3")}</li>
        </ul>
      </div>

      <form action="/admin/import/run" className="mt-5 space-y-5" method="post" onSubmit={() => setIsSubmitting(true)}>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Field label={t("sourceImport.sourceLabel")}>
            <select
              className="field-input"
              name="sourceId"
              defaultValue={selectedSourceId}
              onChange={(event) => setSelectedSourceId(event.target.value)}
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={expectsAmazonInput ? t("sourceImport.asinOrUrl") : t("sourceImport.gameUrl")}>
            <input
              className="field-input"
              name="sourceInput"
              required
              placeholder={
                expectsAmazonInput
                  ? "B0XXXXXXXX o https://www.amazon.es/dp/B0XXXXXXXX"
                  : buildSourcePlaceholder(selectedSource?.baseUrl || "")
              }
            />
          </Field>
        </div>

        {selectedSource ? (
          <div className="rounded-md border border-ink/10 bg-parchment/60 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <Info size={16} aria-hidden="true" />
              {t("sourceImport.selectedSource")}
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{selectedSource.name}</p>
                <p className="text-sm text-ink/60">{selectedSource.baseUrl}</p>
              </div>
              <Link className="button-secondary min-h-9 px-3 py-1.5 text-sm" href={`/admin/sources#source-${selectedSource.id}`}>
                {lang === "en" ? "Edit source" : "Editar fuente"}
              </Link>
            </div>
          </div>
        ) : null}

        <ImportSubmitButton pending={isSubmitting} lang={lang} t={t} />
      </form>

      {initialError ? (
        <p className="mt-4 rounded-md border border-ruby/20 bg-ruby/10 px-4 py-3 text-sm font-semibold text-ruby">
          {initialError}
        </p>
      ) : null}
    </section>
  );
}

function ImportSubmitButton({ pending, lang, t }: { pending: boolean; lang: string; t: (key: any) => string }) {
  return (
    <div className="space-y-4">
      <button className="button-primary" type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
        {pending ? (lang === "en" ? "Importing..." : "Importando...") : t("sourceImport.importButton")}
      </button>

      {pending ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ink">
          <Loader2 className="animate-spin" size={16} aria-hidden="true" />
          {lang === "en"
            ? "Importing data, creating entry and completing fields with AI. The entry will open upon completion."
            : "Importando datos, creando ficha y completando campos con IA. Al terminar se abrirá la ficha."}
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink/60">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function isAmazonSource(source: ImportSource) {
  return `${source.name} ${source.baseUrl}`.toLowerCase().includes("amazon.");
}

function buildSourcePlaceholder(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized ? `${normalized}/...` : "https://ejemplo.com/...";
}
