"use client";

import { useI18n } from "@/i18n/LocaleProvider";
import Checker from "../Checker";
import ProductSearch from "./ProductSearch";

export default function CheckSection() {
  const { t } = useI18n();
  return (
    <section className="section" id="check" aria-labelledby="check-title">
      <div className="section-head">
        <h2 id="check-title" className="display-rose">
          {t.check.title}
        </h2>
        <p className="section-sub">{t.check.sub}</p>
      </div>
      <div className="checker-shell">
        <ProductSearch />
        <Checker />
      </div>
    </section>
  );
}
