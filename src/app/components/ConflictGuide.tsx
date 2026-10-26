"use client";

import { Info, Plus, Warning } from "@phosphor-icons/react";
import { useI18n } from "@/i18n/LocaleProvider";
import { fmt } from "@/i18n/locales";
import type { GuideEntry } from "@/lib/guide";
import EnglishNote from "./EnglishNote";

export default function ConflictGuide({ entries }: { entries: GuideEntry[] }) {
  const { t } = useI18n();
  return (
    <section className="section section-blush" id="conflicts" aria-labelledby="conflicts-title">
      <div className="section-head">
        <h2 id="conflicts-title" className="display-rose">
          {t.guide.title}
        </h2>
        <p className="section-sub">{t.guide.sub}</p>
        <EnglishNote />
      </div>
      <div className="guide-grid">
        {entries.map((e) => (
          <article key={e.id} className={`guide-card sev-${e.severity}`}>
            <p className={`sev-pill sev-pill-${e.severity}`}>
              {e.severity === "caution" ? <Warning size={16} weight="bold" aria-hidden /> : <Info size={16} weight="bold" aria-hidden />}
              {e.severity === "caution" ? t.guide.caution : t.guide.info}
            </p>
            <h3 className="guide-pair" lang="en">
              <span>{e.sides[0]}</span>
              <Plus size={20} weight="bold" aria-label={t.guide.plus} className="guide-plus" />
              <span>{e.sides[1]}</span>
            </h3>
            <p lang="en">{e.explanation}</p>
            <p className="guide-tip">
              <strong>{t.results.tip}</strong> <span lang="en">{e.suggestion}</span>
            </p>
            <details>
              <summary>{fmt(t.results.sources, { n: e.sources.length })}</summary>
              <ul>
                {e.sources.map((s) => (
                  <li key={s.id} lang="en">
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.title}
                    </a>{" "}
                    <span className="muted">({s.publisher})</span>
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
