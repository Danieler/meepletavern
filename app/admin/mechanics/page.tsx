import { AdminTaxonomyPage } from "@/components/AdminTaxonomyPage";

export const dynamic = "force-dynamic";

export default function AdminMechanicsPage() {
  return (
    <AdminTaxonomyPage
      title="Admin de mecánicas"
      description="Mecánicas reales usadas por juegos guardados en la base de datos."
      field="mechanics"
      emptyLabel="Sin mecánicas"
    />
  );
}
