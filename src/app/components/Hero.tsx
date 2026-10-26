"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { useI18n } from "@/i18n/LocaleProvider";
import ScanArt from "./ScanArt";

export default function Hero() {
  const { t } = useI18n();
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="pill pill-solid">{t.hero.badge}</p>
          <h1 id="hero-title" className="display-xl">
            {t.hero.title}
          </h1>
          <div className="hero-actions">
            <a href="#check" className="btn btn-rose btn-lg">
              {t.hero.cta}
            </a>
            <a href="#conflicts" className="text-link">
              {t.hero.guideLink} <ArrowRight size={18} aria-hidden className="flip-rtl" />
            </a>
          </div>
          <p className="hero-fine">{t.hero.fine}</p>
        </div>
        <ScanArt flag={t.hero.artFlag} sources={t.hero.artSources} />
      </div>
    </section>
  );
}
