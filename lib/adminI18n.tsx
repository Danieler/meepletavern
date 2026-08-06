"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { adminTranslations, type AdminLanguage, type TranslationKey } from "./adminTranslations";

type AdminI18nContextType = {
  lang: AdminLanguage;
  setLang: (lang: AdminLanguage) => void;
  t: (key: TranslationKey | (string & {}), fallback?: string) => string;
  tFormat: (key: TranslationKey | (string & {}), params: Record<string, string | number>, fallback?: string) => string;
};

const AdminI18nContext = createContext<AdminI18nContextType | null>(null);

const STORAGE_KEY = "admin_lang";
const COOKIE_NAME = "admin_lang";

export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AdminLanguage>("es");

  useEffect(() => {
    // Read saved language from localStorage or cookie
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") {
      setLangState(saved);
      return;
    }

    const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (cookieMatch && (cookieMatch[1] === "es" || cookieMatch[1] === "en")) {
      setLangState(cookieMatch[1] as AdminLanguage);
    }
  }, []);

  function setLang(newLang: AdminLanguage) {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.cookie = `${COOKIE_NAME}=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore storage errors
    }
  }

  function t(key: TranslationKey | (string & {}), fallback?: string): string {
    const dict = adminTranslations[lang] || adminTranslations.es;
    const value = (dict as Record<string, string>)[key] || (adminTranslations.es as Record<string, string>)[key] || fallback || key;
    return value;
  }

  function tFormat(key: TranslationKey | (string & {}), params: Record<string, string | number>, fallback?: string): string {
    let raw = t(key, fallback);
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      raw = raw.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
    });
    return raw;
  }

  return (
    <AdminI18nContext.Provider value={{ lang, setLang, t, tFormat }}>
      {children}
    </AdminI18nContext.Provider>
  );
}

export function useAdminI18n() {
  const context = useContext(AdminI18nContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      lang: "es" as AdminLanguage,
      setLang: () => {},
      t: (key: TranslationKey | (string & {}), fallback?: string) =>
        (adminTranslations.es as Record<string, string>)[key] || fallback || key,
      tFormat: (key: TranslationKey | (string & {}), params: Record<string, string | number>, fallback?: string) => {
        let raw = (adminTranslations.es as Record<string, string>)[key] || fallback || key;
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          raw = raw.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
        });
        return raw;
      }
    };
  }
  return context;
}

export function T({ k, fallback }: { k: TranslationKey; fallback?: string }) {
  const { t } = useAdminI18n();
  return <>{t(k, fallback)}</>;
}
