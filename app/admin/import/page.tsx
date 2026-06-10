import Link from "next/link";
import { Link2 } from "lucide-react";
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
          description="Importa juegos desde las fuentes conectadas y revisa después la ficha en el admin."
        />
        <Link className="button-secondary w-fit" href="/admin/import/bulk">
          <Link2 size={18} aria-hidden="true" />
          Importación bulk
        </Link>
        {!sources.length ? (
          <div className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
            <p className="text-ink/70">Necesitas registrar una fuente antes de importar juegos.</p>
            <Link className="button-primary mt-4" href="/admin/sources">
              Crear fuente
            </Link>
          </div>
        ) : null}
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
