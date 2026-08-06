import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminTaxonomyContent } from "@/components/AdminTaxonomyContent";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import type { TranslationKey } from "@/lib/adminTranslations";
import { getAdminTaxonomyTerms, type TaxonomyTypeKey } from "@/lib/taxonomy";

type AdminTaxonomyPageProps = {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  emptyKey: TranslationKey;
  type: TaxonomyTypeKey;
  label: string;
};

export async function AdminTaxonomyPage({ titleKey, descriptionKey, emptyKey, type, label }: AdminTaxonomyPageProps) {
  try {
    const terms = await getAdminTaxonomyTerms(type);

    return (
      <AdminTaxonomyContent
        titleKey={titleKey}
        descriptionKey={descriptionKey}
        emptyKey={emptyKey}
        type={type}
        label={label}
        terms={terms}
      />
    );
  } catch (error) {
    const databaseError = getAdminDatabaseError(error);

    if (!databaseError) {
      throw error;
    }

    return <AdminDatabaseNotice error={databaseError} />;
  }
}
