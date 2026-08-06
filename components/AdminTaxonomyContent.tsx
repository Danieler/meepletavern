"use client";

import { AdminTaxonomyCreateForm, AdminTaxonomyTermRow } from "@/components/AdminTaxonomyForms";
import { AdminSectionHeader } from "@/components/AdminSectionHeader";
import { useAdminI18n } from "@/lib/adminI18n";
import type { TranslationKey } from "@/lib/adminTranslations";
import type { TaxonomyTermItem, TaxonomyTypeKey } from "@/lib/taxonomy";

type AdminTaxonomyContentProps = {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  emptyKey: TranslationKey;
  type: TaxonomyTypeKey;
  label: string;
  terms: TaxonomyTermItem[];
};

export function AdminTaxonomyContent({
  titleKey,
  descriptionKey,
  emptyKey,
  type,
  label,
  terms
}: AdminTaxonomyContentProps) {
  const { t } = useAdminI18n();

  return (
    <div>
      <AdminSectionHeader titleKey={titleKey} descriptionKey={descriptionKey} />
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
            {t(emptyKey)}
          </section>
        )}
      </div>
    </div>
  );
}
