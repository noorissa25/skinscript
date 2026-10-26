"use client";

import { BookOpen, Check, Plus } from "@phosphor-icons/react";
import { useRef, useState, type KeyboardEvent } from "react";
import type { Spotlight as SpotlightItem } from "@/lib/guide";
import { useI18n } from "@/i18n/LocaleProvider";
import { fmt } from "@/i18n/locales";
import { sendToChecker } from "../checkerBus";
import EnglishNote from "./EnglishNote";

export interface SpotlightTab {
  id: string;
  labelKey: "actives" | "hydrators" | "watchOuts";
  tone: "rose" | "sage" | "noir";
  items: SpotlightItem[];
}

export default function Spotlight({ tabs }: { tabs: SpotlightTab[] }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (active + delta + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  function add(name: string) {
    sendToChecker({ type: "add", name });
    setStatus(fmt(t.spotlight.addedStatus, { name }));
    setJustAdded(name);
    window.setTimeout(() => setJustAdded((current) => (current === name ? null : current)), 2000);
  }

  const tab = tabs[active];
  return (
    <section className="section" id="ingredients" aria-labelledby="ingredients-title">
      <div className="section-head">
        <h2 id="ingredients-title" className="display-rose">
          {t.spotlight.title}
        </h2>
        <p className="section-sub">{t.spotlight.sub}</p>
        <EnglishNote />
      </div>
      <div className="tabs" role="tablist" aria-label={t.spotlight.tabsAria} onKeyDown={onKeyDown}>
        {tabs.map((tb, i) => (
          <button
            key={tb.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tb.id}`}
            aria-selected={i === active}
            aria-controls={`panel-${tb.id}`}
            tabIndex={i === active ? 0 : -1}
            className="tab"
            onClick={() => setActive(i)}
          >
            {t.spotlight.tabs[tb.labelKey]}
          </button>
        ))}
      </div>
      <div className="card-grid" role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`}>
        {tab.items.map(({ ingredient, badge, watchWith, sourceCount }, i) => (
          <article key={ingredient.id} className="spot-card">
            <div className={`spot-art tone-${tab.tone}`}>
              <SwatchArt seed={i} />
              <span className="pill pill-outline pill-on-art" lang="en">{badge}</span>
            </div>
            <h3 className="spot-name" lang="en">{ingredient.inci}</h3>
            <p className="spot-fn" lang="en">{ingredient.functions.join(" · ")}</p>
            <p className="spot-desc" lang="en">{ingredient.description}</p>
            {watchWith.length > 0 && (
              <div className="spot-flags">
                <span className="spot-flags-label">{t.spotlight.canTrigger}</span>
                <ul lang="en">
                  {watchWith.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="spot-sources">
              <BookOpen size={16} aria-hidden /> {sourceCount === 1 ? t.spotlight.sourceOne : fmt(t.spotlight.sourceMany, { n: sourceCount })}
            </p>
            <button type="button" className="btn btn-rose btn-block" onClick={() => add(ingredient.inci)}>
              {justAdded === ingredient.inci ? (
                <>
                  <Check size={18} weight="bold" aria-hidden /> {t.spotlight.added}
                </>
              ) : (
                <>
                  <Plus size={18} weight="bold" aria-hidden /> {t.spotlight.add}
                </>
              )}
            </button>
          </article>
        ))}
      </div>
      <p className="sr-only" role="status">
        {status}
      </p>
      <p className="view-all">
        <a href="#conflicts" className="text-link">
          {t.spotlight.viewAll} <span className="flip-rtl" aria-hidden>→</span>
        </a>
      </p>
    </section>
  );
}

/** Abstract product-swatch art: soft blobs and "molecule" dots, different per card. */
function SwatchArt({ seed }: { seed: number }) {
  const r = [62, 70, 58, 66][seed % 4];
  const dots = [
    [150, 70],
    [190, 96],
    [178, 140],
    [132, 152],
    [110, 112],
  ];
  return (
    <svg viewBox="0 0 300 220" className="swatch-svg" aria-hidden="true">
      <ellipse cx={120 + seed * 18} cy="120" rx={r + 40} ry={r} className="swatch-blob" transform={`rotate(${-12 + seed * 9} 150 110)`} />
      <circle cx={190 - seed * 10} cy="96" r={r * 0.62} className="swatch-blob-2" />
      <g className="swatch-mol">
        {dots.slice(0, 3 + (seed % 3)).map(([x, y], i, arr) =>
          i > 0 ? <line key={`l${i}`} x1={arr[i - 1][0]} y1={arr[i - 1][1]} x2={x} y2={y} /> : null,
        )}
        {dots.slice(0, 3 + (seed % 3)).map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="9" />
        ))}
      </g>
    </svg>
  );
}
