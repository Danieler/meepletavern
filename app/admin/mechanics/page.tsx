import { AdminTaxonomyPage } from "@/components/AdminTaxonomyPage";

export const dynamic = "force-dynamic";

export default function AdminMechanicsPage() {
  return (
    <AdminTaxonomyPage
      title="Admin de mecánicas"
      description="Añade, renombra o elimina mecánicas disponibles para clasificar juegos."
      type="mechanic"
      label="mecánica"
      emptyLabel="Todavía no hay mecánicas."
    />
  );
}
