import { GameCandidateStatus, MediaAssetStatus, MediaAssetType, MediaAssetUsage } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, ChevronLeft, ExternalLink, FileInput, ImagePlus, Save, Trash2, XCircle } from "lucide-react";
import {
  convertCandidateAction,
  createMediaFromCandidateImageAction,
  deleteCandidateAction,
  generateAiDraftAction,
  rejectCandidateAction,
  updateMediaAssetAction
} from "@/app/admin/candidates/[id]/actions";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { normalizeAiDraft, normalizeCandidateImages, normalizeCandidateMetadata } from "@/lib/editorialMappers";
import { gameCandidateRepository } from "@/lib/editorialRepositories";
import { getSourcePolicy } from "@/lib/sourcePolicy";

export const dynamic = "force-dynamic";

type CandidateDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CandidateDetailPage({ params }: CandidateDetailPageProps) {
  const { id } = await params;

  try {
    const candidate = await gameCandidateRepository.getById(id);

    if (!candidate) {
      notFound();
    }

    const metadata = normalizeCandidateMetadata(candidate.metadata);
    const candidateImages = normalizeCandidateImages(candidate.candidateImages);
    const aiDraft = normalizeAiDraft(candidate.aiDraft);
    const sourcePolicy = getSourcePolicy(candidate.source);
    const linkedGameId = candidate.gameId ?? candidate.mediaAssets.find((asset) => asset.gameId)?.gameId ?? null;
    const canConvert =
      candidate.status !== GameCandidateStatus.converted &&
      candidate.status !== GameCandidateStatus.rejected;
    const flowLabel = getFlowLabel(candidate.status, candidate.game);
    const flowMessage = getFlowMessage(candidate.status, candidate.game);

    return (
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-moss" href="/admin/candidates">
          <ChevronLeft size={16} aria-hidden="true" />
          Volver a candidatos
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader title={candidate.title} description={`Estado del flujo: ${flowLabel}`} />
          <div className="flex flex-wrap gap-2">
            {linkedGameId ? (
              <Link className="button-primary" href={`/admin/games/${linkedGameId}`}>
                <ExternalLink size={18} aria-hidden="true" />
                Abrir ficha
              </Link>
            ) : canConvert ? (
              <form action={convertCandidateAction}>
                <input type="hidden" name="id" value={candidate.id} />
                <button className="button-primary" type="submit">
                  <FileInput size={18} aria-hidden="true" />
                  Crear ficha y abrir
                </button>
              </form>
            ) : null}
            <form action={rejectCandidateAction}>
              <input type="hidden" name="id" value={candidate.id} />
              <button className="button-secondary" type="submit" disabled={candidate.status === GameCandidateStatus.rejected}>
                <XCircle size={18} aria-hidden="true" />
                Rechazar
              </button>
            </form>
            <form action={deleteCandidateAction}>
              <input type="hidden" name="id" value={candidate.id} />
              <button className="button-secondary" type="submit">
                <Trash2 size={18} aria-hidden="true" />
                Eliminar
              </button>
            </form>
          </div>
        </div>

        <div className={`rounded-md px-4 py-3 text-sm text-ink/80 ${candidate.gameId ? "border border-moss/20 bg-moss/10" : "border border-amber-300 bg-amber-50"}`}>
          <p className="font-bold text-ink">{flowLabel}</p>
          <p className="mt-1">{flowMessage}</p>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <Panel title="Origen">
              <dl className="grid gap-3 text-sm">
                <Info label="Fuente" value={candidate.source.name} />
                <Info label="Estado de fuente" value={candidate.source.status} />
                <div>
                  <dt className="font-bold text-ink/55">URL de origen</dt>
                  <dd className="mt-1">
                    <a className="inline-flex items-center gap-2 font-semibold text-moss" href={candidate.sourceUrl} target="_blank" rel="noreferrer">
                      {candidate.sourceUrl}
                      <ExternalLink size={15} aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Metadatos">
              <JsonBlock value={metadata} />
            </Panel>

            <Panel title="Imágenes candidatas">
              {candidateImages.length ? (
                <div className="grid gap-3">
                  {candidateImages.map((image) => (
                    <div key={image.url} className="rounded-md border border-ink/10 p-3">
                      <a className="font-semibold text-moss" href={image.url} target="_blank" rel="noreferrer">
                        {image.url}
                      </a>
                      <p className="mt-1 text-sm text-ink/55">{image.type || "sin tipo"}</p>
                      <form action={createMediaFromCandidateImageAction} className="mt-3 flex flex-wrap items-end gap-3">
                        <input type="hidden" name="id" value={candidate.id} />
                        <input type="hidden" name="imageUrl" value={image.url} />
                        <label className="block min-w-40">
                          <span className="text-xs font-bold text-ink/55">Tipo</span>
                          <select className="field-input mt-1" name="type" defaultValue={image.type || MediaAssetType.cover}>
                            {Object.values(MediaAssetType).map((type) => (
                              <option key={type} value={type}>
                                {mediaAssetTypeLabel(type)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="button-secondary" type="submit">
                          <ImagePlus size={18} aria-hidden="true" />
                          Crear asset multimedia
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink/60">Sin imágenes candidatas.</p>
              )}
            </Panel>

            <Panel title="Borrador IA">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <form action={generateAiDraftAction}>
                  <input type="hidden" name="id" value={candidate.id} />
                  <button className="button-secondary" type="submit">
                    <Bot size={18} aria-hidden="true" />
                    {aiDraft ? "Regenerar borrador IA" : "Generar borrador IA"}
                  </button>
                </form>
                <span className="text-sm text-ink/60">
                  Generado: {candidate.aiGenerated ? "sí" : "no"} · Revisado: {candidate.aiReviewed ? "sí" : "no"}
                </span>
              </div>
              {aiDraft ? <JsonBlock value={aiDraft} /> : <p className="text-sm text-ink/60">Sin borrador IA.</p>}
            </Panel>

            <Panel title="Assets multimedia">
              <p className="mb-4 text-sm text-ink/60">
                Las imágenes solo serán públicas si el asset está aprobado, su uso es public y la fuente permite imágenes.
              </p>
              {!sourcePolicy.canUseImagePublicly ? (
                <p className="mb-4 rounded-md bg-ember/10 p-3 text-sm font-semibold text-ink">
                  Esta fuente no permite imágenes públicas ahora mismo. Si guardas usage public se conservará como admin_only.
                </p>
              ) : null}
              {candidate.mediaAssets.length ? (
                <div className="grid gap-4">
                  {candidate.mediaAssets.map((asset) => (
                    <form key={asset.id} action={updateMediaAssetAction} className="rounded-md border border-ink/10 p-3">
                      <input type="hidden" name="id" value={candidate.id} />
                      <input type="hidden" name="mediaAssetId" value={asset.id} />
                      <div className="mb-3 overflow-hidden text-sm">
                        <a className="font-semibold text-moss" href={asset.url} target="_blank" rel="noreferrer">
                          {asset.url}
                        </a>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Field label="Estado">
                          <select className="field-input" name="status" defaultValue={asset.status}>
                            {Object.values(MediaAssetStatus).map((status) => (
                              <option key={status} value={status}>
                                {mediaAssetStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Uso">
                          <select className="field-input" name="usage" defaultValue={asset.usage}>
                            {Object.values(MediaAssetUsage).map((usage) => (
                              <option key={usage} value={usage}>
                                {mediaAssetUsageLabel(usage)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Tipo">
                          <select className="field-input" name="type" defaultValue={asset.type}>
                            {Object.values(MediaAssetType).map((type) => (
                              <option key={type} value={type}>
                                {mediaAssetTypeLabel(type)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="ID de ficha">
                          <input className="field-input" name="gameId" defaultValue={asset.gameId || ""} />
                        </Field>
                        <Field label="ID de candidato">
                          <input className="field-input" name="candidateId" defaultValue={asset.candidateId || candidate.id} />
                        </Field>
                        <Field label="ID de fuente">
                          <input className="field-input" name="sourceId" defaultValue={asset.sourceId || candidate.sourceId} />
                        </Field>
                        <Field label="Ruta local">
                          <input className="field-input" name="localPath" defaultValue={asset.localPath || ""} />
                        </Field>
                        <Field label="Atribución">
                          <input className="field-input" name="attribution" defaultValue={asset.attribution || ""} />
                        </Field>
                      </div>
                      <button className="button-primary mt-4" type="submit">
                        <Save size={18} aria-hidden="true" />
                        Guardar asset multimedia
                      </button>
                    </form>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink/60">Sin media assets creados.</p>
              )}
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel title="Resumen">
              <dl className="grid gap-3 text-sm">
                <Info label="Título original" value={candidate.originalTitle || "Pendiente"} />
                <Info label="Confianza" value={`${Math.round(candidate.confidence * 100)}%`} />
                <Info label="Creado" value={formatDate(candidate.createdAt)} />
                <Info label="Actualizado" value={formatDate(candidate.updatedAt)} />
              </dl>
            </Panel>

            <Panel title="Indicadores">
              <div className="flex flex-wrap gap-2">
                {candidate.flags.map((flag) => (
                  <span key={flag} className="rounded-md bg-ember/10 px-2.5 py-1 text-xs font-semibold text-ink">
                    {flag}
                  </span>
                ))}
                {!candidate.flags.length ? <p className="text-sm text-ink/60">Sin flags.</p> : null}
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    );
  } catch (error) {
    const databaseError = getAdminDatabaseError(error);

    if (!databaseError) {
      throw error;
    }

    return <AdminDatabaseNotice error={databaseError} />;
  }
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold text-ink/55">{label}</dt>
      <dd className="mt-1 text-ink/75">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-ink/55">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function getFlowLabel(status: GameCandidateStatus, game?: { status: string | null } | null) {
  if (game) {
    if (game.status === "published") {
      return "Importado · publicado";
    }

    if (game.status === "review" || game.status === "draft") {
      return "Importado · ficha creada";
    }
  }

  if (status === GameCandidateStatus.approved) {
    return "Listo para publicar";
  }

  if (status === GameCandidateStatus.needs_review) {
    return "En revisión";
  }

  if (status === GameCandidateStatus.converted) {
    return "Importado";
  }

  if (status === GameCandidateStatus.rejected) {
    return "Rechazado";
  }

  return "Pendiente";
}

function getFlowMessage(status: GameCandidateStatus, game?: { status: string | null } | null) {
  if (game) {
    if (game.status === "published") {
      return "La ficha ya existe y la revisión se hace sobre el juego publicado.";
    }

    return "La ficha ya está creada. Continúa la revisión directamente en el juego enlazado.";
  }

  if (status === GameCandidateStatus.approved) {
    return "El candidato ya está listo para crear la ficha final y publicarlo cuando toque.";
  }

  if (status === GameCandidateStatus.needs_review) {
    return "Este candidato necesita revisión antes de crear la ficha final.";
  }

  if (status === GameCandidateStatus.converted) {
    return "La importación ya creó la ficha, pero todavía no se ha enlazado correctamente.";
  }

  return "Aún no se ha decidido si este candidato pasa a ficha o se descarta.";
}

function mediaAssetTypeLabel(value: MediaAssetType) {
  switch (value) {
    case MediaAssetType.cover:
      return "Portada";
    case MediaAssetType.box:
      return "Caja";
    case MediaAssetType.component:
      return "Componente";
    case MediaAssetType.placeholder:
      return "Marcador";
  }
}

function mediaAssetStatusLabel(value: MediaAssetStatus) {
  switch (value) {
    case MediaAssetStatus.candidate:
      return "Candidato";
    case MediaAssetStatus.approved:
      return "Aprobado";
    case MediaAssetStatus.rejected:
      return "Rechazado";
  }
}

function mediaAssetUsageLabel(value: MediaAssetUsage) {
  switch (value) {
    case MediaAssetUsage.public:
      return "Público";
    case MediaAssetUsage.admin_only:
      return "Solo admin";
    case MediaAssetUsage.purchase_only:
      return "Solo compra";
  }
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-ink p-4 text-xs leading-5 text-white">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
