import { AdminTaxonomyPage } from "@/components/AdminTaxonomyPage";

export const dynamic = "force-dynamic";

export default function AdminTavernPage() {
  return (
    <AdminTaxonomyPage
      title="Admin de taberna"
      description="Temáticas reales de la taberna usadas por juegos guardados en la base de datos."
      field="themes"
      emptyLabel="Sin temáticas"
    />
  );
}
