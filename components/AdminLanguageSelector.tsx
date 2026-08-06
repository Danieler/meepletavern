"use client";

import { Globe } from "lucide-react";
import { useAdminI18n } from "@/lib/adminI18n";
import type { AdminLanguage } from "@/lib/adminTranslations";

export function AdminLanguageSelector() {
  const { lang, setLang, t } = useAdminI18n();

  return (
    <div className="relative inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-white px-2.5 py-1.5 shadow-soft focus-within:border-moss/40">
      <Globe size={16} className="text-ink/50 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as AdminLanguage)}
        className="bg-transparent text-xs font-bold uppercase tracking-wider text-ink outline-none cursor-pointer pr-1"
        aria-label={t("common.language")}
      >
        <option value="es">🇪🇸 ES</option>
        <option value="en">🇬🇧 EN</option>
      </select>
    </div>
  );
}
