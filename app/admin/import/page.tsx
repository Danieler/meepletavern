import Link from "next/link";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { SectionHeader } from "@/components/SectionHeader";
import { SourceImportForm } from "@/components/SourceImportForm";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { sourceRepository } from "@/lib/editorialRepositories";

export const dynamic = "force-dynamic";

type AdminImportPageProps = {
  searchParams?: Promise<{
    sourceId?: string;
  }>;
};

export default async function AdminImportPage({ searchParams }: AdminImportPageProps) {
  const params = await searchParams;

  try {
    const sources = await sourceRepository.list();

    return (
      <div className="space-y-6">
        <SectionHeader
          title="Importación manual"
          description="Importa juegos desde cualquier fuente registrada y revisa después la ficha en el admin."
        />
        {!sources.length ? (
          <div className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
            <p className="text-ink/70">Necesitas registrar una fuente antes de importar juegos.</p>
            <Link className="button-primary mt-4" href="/admin/sources">
              Crear fuente
            </Link>
          </div>
        ) : null}
        <SourceImportForm
          sources={sources.map((source) => ({
            id: source.id,
            name: source.name,
            baseUrl: source.baseUrl
          }))}
          initialSourceId={params?.sourceId || ""}
        />
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
