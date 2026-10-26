"use client";

import { useI18n } from "@/i18n/LocaleProvider";

export default function Faq() {
  const { t } = useI18n();
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="section-head">
        <h2 id="faq-title" className="display-rose">
          {t.faq.title}
        </h2>
      </div>
      <div className="faq">
        {t.faq.items.map(({ q, a }, i) => (
          <details key={i} className="faq-item">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <p className="disclaimer-box">
        <strong>{t.faq.disclaimerLabel}</strong> {t.disclaimer}
      </p>
    </section>
  );
}
