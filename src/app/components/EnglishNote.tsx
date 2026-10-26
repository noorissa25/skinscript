"use client";

import { Info } from "@phosphor-icons/react";
import { useI18n } from "@/i18n/LocaleProvider";

/** Shown outside English: knowledge-base content (ingredients, flags) stays in English until reviewed. */
export default function EnglishNote() {
  const { locale, t } = useI18n();
  if (locale === "en") return null;
  return (
    <p className="english-note">
      <Info size={18} weight="bold" aria-hidden /> {t.results.englishNote}
    </p>
  );
}
