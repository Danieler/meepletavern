import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { CreateSourceForm, EditSourceForm } from "@/components/AdminSourceForms";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { sourceRepository } from "@/lib/editorialRepositories";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  try {
    const sources = await sourceRepository.list();

    return (
      <div className="space-y-8">
        <SectionHeader
          title="Fuentes"
          description="Gestiona permisos, atribución y estado de las fuentes editoriales."
        />
        <CreateSourceForm />
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-ink">Fuentes registradas</h2>
          {sources.map((source) => (
            <EditSourceForm key={source.id} source={source} />
          ))}
          {!sources.length ? (
            <p className="rounded-md border border-ink/10 bg-white px-4 py-10 text-center text-ink/60 shadow-soft">
              Todavía no hay fuentes.
            </p>
          ) : null}
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
