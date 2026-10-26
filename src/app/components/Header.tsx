"use client";

import { List, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { fmt } from "@/i18n/locales";
import { brand } from "@/lib/brand";
import { NAV, navLabel } from "@/lib/nav";
import AccountButton from "../account/AccountButton";
import LanguageSelect from "./LanguageSelect";
import Wordmark from "./Wordmark";

export default function Header() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        {t.nav.skip}
      </a>
      <div className="header-bar">
        <a href="#top" className="header-logo" aria-label={fmt(t.nav.home, { brand: brand.name })}>
          <Wordmark />
        </a>
        <nav aria-label={t.nav.main} className="header-nav">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{navLabel(t, item.key)}</a>
              </li>
            ))}
          </ul>
        </nav>
        <LanguageSelect />
        <AccountButton />
        <a href="#check" className="header-cta">
          {t.nav.cta}
        </a>
        <button
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={26} aria-hidden /> : <List size={26} aria-hidden />}
        </button>
      </div>
      <nav id="mobile-nav" aria-label={t.nav.main} className="mobile-nav" hidden={!open}>
        <ul>
          {NAV.map((item) => (
            <li key={item.href}>
              <a href={item.href} onClick={() => setOpen(false)}>
                {navLabel(t, item.key)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
