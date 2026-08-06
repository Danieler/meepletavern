import { AdminTaxonomyPage } from "@/components/AdminTaxonomyPage";

export const dynamic = "force-dynamic";

export default function AdminMechanicsPage() {
  return (
    <AdminTaxonomyPage
      titleKey="mechanics.title"
      descriptionKey="mechanics.description"
      emptyKey="mechanics.empty"
      type="mechanic"
      label="mecánica"
    />
  );
}
