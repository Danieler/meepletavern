import Link from "next/link";
import { Link2, Upload } from "lucide-react";
import { createManualCandidateAction } from "@/app/admin/import/actions";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AmazonImportForm } from "@/components/AmazonImportForm";
import { AsmodeeImportForm } from "@/components/AsmodeeImportForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { normalizeSourcePermissions } from "@/lib/editorialMappers";
import { sourceRepository } from "@/lib/editorialRepositories";
import { isAmazonImportSource, isAsmodeeImportSource } from "@/lib/importSourceFilters";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  try {
    const sources = await sourceRepository.list();
    const amazonSources = sources
      .filter(isAmazonImportSource)
      .map((source) => ({
        id: source.id,
        name: source.name,
        status: source.status,
        type: source.type,
        permissions: normalizeSourcePermissions(source.permissions)
      }));
    const asmodeeSources = sources
      .filter(isAsmodeeImportSource)
      .map((source) => ({
        id: source.id,
        name: source.name,
        status: source.status
      }));

    return (
      <div className="space-y-6">
        <SectionHeader
          title="Importación manual"
          description="Crea candidatos editoriales manuales o importa desde Amazon con un flujo controlado."
        />
        <Link className="button-secondary w-fit" href="/admin/import/bulk">
          <Link2 size={18} aria-hidden="true" />
          Importación bulk
        </Link>
        {!sources.length ? (
          <div className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
            <p className="text-ink/70">Necesitas registrar una fuente antes de crear candidatos.</p>
            <Link className="button-primary mt-4" href="/admin/sources">
              Crear fuente
            </Link>
          </div>
        ) : (
          <form action={createManualCandidateAction} className="space-y-6 rounded-md border border-ink/10 bg-white p-5 shadow-soft">
            <section>
              <h2 className="text-xl font-bold text-ink">Origen</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Fuente">
                  <select className="field-input" name="sourceId" required>
                    {sources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name} · {source.status}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="URL de origen">
                  <input className="field-input" name="sourceUrl" required placeholder="https://..." />
                </Field>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-ink">Datos básicos</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Título">
                  <input className="field-input" name="title" required />
                </Field>
                <Field label="Título original">
                  <input className="field-input" name="originalTitle" />
                </Field>
                <Field label="Año">
                  <input className="field-input" name="year" type="number" min="1" />
                </Field>
                <Field label="Editorial">
                  <input className="field-input" name="publisher" />
                </Field>
                <Field label="Jugadores mínimos">
                  <input className="field-input" name="minPlayers" type="number" min="1" />
                </Field>
                <Field label="Jugadores máximos">
                  <input className="field-input" name="maxPlayers" type="number" min="1" />
                </Field>
                <Field label="Edad mínima">
                  <input className="field-input" name="minAge" type="number" min="1" />
                </Field>
                <Field label="Duración mínima">
                  <input className="field-input" name="minPlayTime" type="number" min="1" />
                </Field>
                <Field label="Duración máxima">
                  <input className="field-input" name="maxPlayTime" type="number" min="1" />
                </Field>
                <Field label="Imagen candidata">
                  <input className="field-input" name="candidateImageUrl" placeholder="https://..." />
                </Field>
              </div>
            </section>

            <button className="button-primary" type="submit">
              <Upload size={18} aria-hidden="true" />
              Crear candidato
            </button>
          </form>
        )}
        <AmazonImportForm sources={amazonSources} />
        <AsmodeeImportForm sources={asmodeeSources} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink/60">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
