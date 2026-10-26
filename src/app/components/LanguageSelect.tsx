"use client";

import { Globe } from "@phosphor-icons/react";
import { LOCALES, useI18n } from "@/i18n/LocaleProvider";
import { isLocale } from "@/i18n/locales";

export default function LanguageSelect() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="lang-select">
      <Globe size={20} weight="bold" aria-hidden />
      <span className="sr-only">{t.nav.language}</span>
      <span className="lang-code" aria-hidden="true">
        {locale.toUpperCase()}
      </span>
      <select
        value={locale}
        onChange={(e) => {
          if (isLocale(e.target.value)) setLocale(e.target.value);
        }}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
