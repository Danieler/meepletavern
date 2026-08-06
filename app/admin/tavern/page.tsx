import { AdminTaxonomyPage } from "@/components/AdminTaxonomyPage";

export const dynamic = "force-dynamic";

export default function AdminTavernPage() {
  return (
    <AdminTaxonomyPage
      titleKey="tavern.title"
      descriptionKey="tavern.description"
      emptyKey="tavern.empty"
      type="theme"
      label="taberna"
    />
  );
}
