import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminTaxonomyCreateForm, AdminTaxonomyTermRow } from "@/components/AdminTaxonomyForms";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { getAdminTaxonomyTerms, type TaxonomyTypeKey } from "@/lib/taxonomy";

type AdminTaxonomyPageProps = {
  title: string;
  description: string;
  type: TaxonomyTypeKey;
  label: string;
  emptyLabel: string;
};

export async function AdminTaxonomyPage({ title, description, type, label, emptyLabel }: AdminTaxonomyPageProps) {
  try {
    const terms = await getAdminTaxonomyTerms(type);

    return (
      <div>
        <SectionHeader title={title} description={description} />
        <div className="grid gap-5">
          <AdminTaxonomyCreateForm type={type} label={label} />

          {terms.length ? (
            <ul className="grid gap-3">
              {terms.map((term) => (
                <AdminTaxonomyTermRow key={term.id} term={term} type={type} />
              ))}
            </ul>
          ) : (
            <section className="rounded-md border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60 shadow-soft">
              {emptyLabel}
            </section>
          )}
        </div>
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
