"use client";

import { ArrowSquareOut, MagnifyingGlass } from "@phosphor-icons/react";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { fmt } from "@/i18n/locales";
import { searchProducts, type ProductHit } from "@/lib/products";
import { isStaticDemo } from "@/lib/runtime";
import { sendToChecker } from "../checkerBus";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; products: ProductHit[] }
  | { status: "error" };

export default function ProductSearch() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [added, setAdded] = useState("");

  async function search(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setState({ status: "loading" });
    setAdded("");
    try {
      let products: ProductHit[];
      if (isStaticDemo) {
        // Open Beauty Facts allows browser requests (CORS), so the demo calls it directly.
        products = await searchProducts(q);
      } else {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(String(res.status));
        products = ((await res.json()) as { products: ProductHit[] }).products;
      }
      setState({ status: "done", products });
    } catch (err) {
      console.error(err);
      setState({ status: "error" });
    }
  }

  function use(p: ProductHit) {
    const name = [p.brand, p.name].filter(Boolean).join(" ");
    sendToChecker({
      type: "product",
      name,
      text: p.ingredients,
      source: { label: "Open Beauty Facts", url: p.url, retrieved: new Date().toISOString().slice(0, 10) },
    });
    setAdded(fmt(t.search.added, { name }));
  }

  return (
    <div className="product-search card">
      <form role="search" onSubmit={search} className="search-row">
        <label htmlFor="product-search" className="search-label">
          {t.search.label}
        </label>
        <div className="search-field">
          <MagnifyingGlass size={20} aria-hidden className="search-icon" />
          <input
            id="product-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={t.search.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
          />
          <button type="submit" className="btn btn-rose" disabled={state.status === "loading" || query.trim().length < 2}>
            {state.status === "loading" ? t.search.searching : t.search.button}
          </button>
        </div>
      </form>

      <p className="sr-only" role="status">
        {state.status === "done" ? fmt(t.search.count, { n: state.products.length }) : ""}
        {added}
      </p>

      {state.status === "error" && <p className="error">{t.search.error}</p>}
      {state.status === "done" && state.products.length === 0 && <p className="hint">{t.search.none}</p>}
      {state.status === "done" && state.products.length > 0 && (
        <ul className="search-results">
          {state.products.map((p) => (
            <li key={p.code} className="search-result">
              <div className="result-thumb">
                {p.image ? <Image src={p.image} alt="" width={56} height={56} unoptimized /> : null}
              </div>
              <div className="result-text" lang="en">
                <span className="result-brand">{p.brand}</span>
                <span className="result-name">{p.name}</span>
                <a href={p.url} target="_blank" rel="noreferrer" className="result-link">
                  Open Beauty Facts <ArrowSquareOut size={14} aria-hidden />
                </a>
              </div>
              <button type="button" className="btn btn-outline result-use" onClick={() => use(p)}>
                {t.search.use}
              </button>
            </li>
          ))}
        </ul>
      )}
      {added && <p className="hint search-added">{added}</p>}
      <p className="fine search-note">
        {t.search.note}{" "}
        <a href="https://world.openbeautyfacts.org/contribute" target="_blank" rel="noreferrer">
          {t.search.addMissing}
        </a>
      </p>
    </div>
  );
}
