import { AdminTaxonomyPage } from "@/components/AdminTaxonomyPage";

export const dynamic = "force-dynamic";

export default function AdminTavernPage() {
  return (
    <AdminTaxonomyPage
      title="Admin de taberna"
      description="Añade, renombra o elimina temáticas de la taberna."
      type="theme"
      label="taberna"
      emptyLabel="Todavía no hay temáticas."
    />
  );
}
