import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { CreateSourceForm, SourceList } from "@/components/AdminSourceForms";
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
          description="Da de alta webs desde las que se pueden importar juegos."
        />
        <CreateSourceForm />
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-ink">Fuentes registradas</h2>
          <SourceList sources={sources} />
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
