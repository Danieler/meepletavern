"use client";

import { SectionHeader } from "@/components/SectionHeader";
import { useAdminI18n } from "@/lib/adminI18n";
import type { TranslationKey } from "@/lib/adminTranslations";

type AdminSectionHeaderProps = {
  titleKey?: TranslationKey;
  descriptionKey?: TranslationKey;
  title?: string;
  description?: string;
  eyebrow?: string;
};

export function AdminSectionHeader({
  titleKey,
  descriptionKey,
  title,
  description,
  eyebrow
}: AdminSectionHeaderProps) {
  const { t } = useAdminI18n();

  const finalTitle = titleKey ? t(titleKey, title) : (title || "");
  const finalDesc = descriptionKey ? t(descriptionKey, description) : description;

  return <SectionHeader title={finalTitle} description={finalDesc} eyebrow={eyebrow} />;
}
