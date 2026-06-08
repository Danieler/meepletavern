import { AdminTaxonomyPage } from "@/components/AdminTaxonomyPage";

export const dynamic = "force-dynamic";

export default function AdminCategoriesPage() {
  return (
    <AdminTaxonomyPage
      title="Admin de categorías"
      description="Añade, renombra o elimina categorías disponibles para clasificar juegos."
      type="category"
      label="categoría"
      emptyLabel="Todavía no hay categorías."
    />
  );
}
