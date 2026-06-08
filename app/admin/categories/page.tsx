import { AdminTaxonomyPage } from "@/components/AdminTaxonomyPage";

export const dynamic = "force-dynamic";

export default function AdminCategoriesPage() {
  return (
    <AdminTaxonomyPage
      title="Admin de categorías"
      description="Categorías reales usadas por juegos guardados en la base de datos."
      field="categories"
      emptyLabel="Sin categorías"
    />
  );
}
