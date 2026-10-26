"use client";

import { Camera, ListMagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import { useI18n } from "@/i18n/LocaleProvider";
import { fmt } from "@/i18n/locales";
import type { Source } from "@/lib/types";

const ICONS = [Camera, ListMagnifyingGlass, ShieldCheck];

export default function HowItWorks({ counts, sources }: { counts: { ingredients: number; rules: number; sources: number }; sources: Source[] }) {
  const { t } = useI18n();
  return (
    <section className="section" id="how" aria-labelledby="how-title">
      <div className="section-head">
        <h2 id="how-title" className="display-rose">
          {t.how.title}
        </h2>
        <p className="section-sub">{fmt(t.how.sub, counts)}</p>
      </div>
      <ol className="steps">
        {t.how.steps.map(({ title, body }, i) => {
          const Icon = ICONS[i];
          return (
            <li key={i} className="step">
              <span className="step-num" aria-hidden="true">
                {i + 1}
              </span>
              <Icon size={36} weight="duotone" className="step-icon" aria-hidden />
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          );
        })}
      </ol>
      <div className="sources-block">
        <h3 className="display-sm">{t.how.sourcesTitle}</h3>
        <ul className="sources-list">
          {sources.map((s) => (
            <li key={s.id} lang="en">
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
              <span className="muted"> · {s.publisher}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
