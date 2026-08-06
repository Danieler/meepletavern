import { AdminTaxonomyPage } from "@/components/AdminTaxonomyPage";

export const dynamic = "force-dynamic";

export default function AdminCategoriesPage() {
  return (
    <AdminTaxonomyPage
      titleKey="categories.title"
      descriptionKey="categories.description"
      emptyKey="categories.empty"
      type="category"
      label="categoría"
    />
  );
}
