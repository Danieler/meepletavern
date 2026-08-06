import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { CreateSourceForm, SourceList } from "@/components/AdminSourceForms";
import { AdminSectionHeader } from "@/components/AdminSectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { sourceRepository } from "@/lib/editorialRepositories";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  try {
    const sources = await sourceRepository.list();

    return (
      <div className="space-y-8">
        <AdminSectionHeader
          titleKey="sources.title"
          descriptionKey="sources.description"
        />
        <CreateSourceForm />
        <section className="space-y-4">
          <AdminSectionHeader titleKey="import.sourcesTitle" />
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
