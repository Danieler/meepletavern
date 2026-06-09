import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminBulkImportForm } from "@/components/AdminBulkImportForm";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { sourceRepository } from "@/lib/editorialRepositories";
import { isAsmodeeImportSource } from "@/lib/importSourceFilters";

export const dynamic = "force-dynamic";

export default async function AdminBulkImportPage() {
  try {
    const sources = await sourceRepository.list();
    const asmodeeSources = sources.filter(isAsmodeeImportSource);

    return (
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-moss" href="/admin/import">
          <ChevronLeft size={16} aria-hidden="true" />
          Volver a importar
        </Link>
        <SectionHeader
          title="Importación bulk"
          description="Crea candidatos desde URLs de producto, sin publicar juegos ni aprobar imágenes automáticamente."
        />
        {!asmodeeSources.length ? (
          <div className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
            <p className="text-ink/70">No hay ninguna fuente Asmodee configurada.</p>
            <Link className="button-primary mt-4" href="/admin/sources">
              Crear fuente Asmodee
            </Link>
          </div>
        ) : (
          <AdminBulkImportForm
            sources={asmodeeSources.map((source) => ({ id: source.id, name: source.name, status: source.status }))}
          />
        )}
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
