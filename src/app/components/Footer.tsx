"use client";

import { useI18n } from "@/i18n/LocaleProvider";
import { NAV, navLabel } from "@/lib/nav";
import Wordmark from "./Wordmark";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <Wordmark className="wordmark-footer" />
          <p className="footer-tag">{t.footer.tagline}</p>
        </div>
        <nav aria-label={t.nav.footer}>
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{navLabel(t, item.key)}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="footer-fine">{t.footer.fine}</p>
    </footer>
  );
}
