"use client";

import { Plus, Warning } from "@phosphor-icons/react";
import { useI18n } from "@/i18n/LocaleProvider";
import { sendToChecker } from "../checkerBus";

export default function RoutineBanner() {
  const { t } = useI18n();
  return (
    <section className="section" aria-labelledby="routine-title">
      <div className="promo">
        <div className="promo-copy">
          <p className="eyebrow-sage">{t.routine.eyebrow}</p>
          <h2 id="routine-title" className="display-lg">
            {t.routine.title}
          </h2>
          <p className="promo-sub">{t.routine.sub}</p>
          <button type="button" className="btn btn-rose btn-lg" onClick={() => sendToChecker({ type: "sample", id: "routine-retinol-aha" })}>
            {t.routine.cta}
          </button>
        </div>
        <div className="promo-visual" aria-hidden="true">
          <div className="mini-product">
            <span className="mini-label" lang="en">CeraVe Skin Renewing Retinol Serum</span>
            <span className="mini-hit">Retinol</span>
          </div>
          <Plus size={28} weight="bold" className="promo-plus" />
          <div className="mini-product">
            <span className="mini-label" lang="en">The Ordinary Glycolic Acid 7%</span>
            <span className="mini-hit">Glycolic Acid</span>
          </div>
          <div className="promo-result">
            <Warning size={20} weight="bold" /> {t.routine.result}
          </div>
        </div>
      </div>
    </section>
  );
}
