"use client";

import { Camera } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { avoidMatches, type SavedProduct } from "@/lib/account";
import { getRoutine } from "@/lib/accountApi";
import { analyzeProducts } from "@/lib/analyze";
import { basePath, isStaticDemo } from "@/lib/runtime";
import { validateProducts } from "@/lib/validate";
import { useI18n } from "@/i18n/LocaleProvider";
import { fmt } from "@/i18n/locales";
import type { Messages } from "@/i18n/messages";
import type { Analysis, Finding, Hit } from "@/lib/types";
import { samples, type SampleSource } from "@/lib/samples";
import { onCheckerCommand, sendToChecker } from "./checkerBus";
import CheckActions from "./account/CheckActions";
import { useAuth } from "./account/AuthProvider";
import EnglishNote from "./components/EnglishNote";
import { recognizeLabel } from "./ocr";

const MAX_PRODUCTS = 4;

interface Draft {
  key: number;
  name: string;
  text: string;
  ocr?: { progress: number } | null;
  ocrError?: boolean;
  /** Text came from OCR and has not been edited since. */
  fromOcr?: boolean;
  /** Where a sample product's list came from; cleared once the text is edited. */
  source?: SampleSource;
}

let nextKey = 1;
const emptyDraft = (): Draft => ({ key: nextKey++, name: "", text: "" });

export default function Checker() {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  // The exact products behind the current result, for saving and sharing.
  const [checked, setChecked] = useState<SavedProduct[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [llm, setLlm] = useState(false);
  const [summary, setSummary] = useState<{ text?: string; error?: boolean; loading?: boolean } | null>(null);

  useEffect(() => {
    if (isStaticDemo) return; // No server, so no AI summary.
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { llm?: boolean }) => setLlm(Boolean(d.llm)))
      .catch(() => setLlm(false));
  }, []);

  useEffect(
    () =>
      onCheckerCommand((command) => {
        if (command.type === "sample") {
          loadSample(command.id);
          return;
        }
        if (command.type === "load") {
          setDrafts(command.products.map((p) => ({ ...emptyDraft(), name: p.name, text: p.text })));
          setAnalysis(null);
          setError(false);
          return;
        }
        if (command.type === "product") {
          const product = { name: command.name, text: command.text, source: command.source, fromOcr: false };
          setAnalysis(null);
          // Fill the first empty box, otherwise add a new product (up to the limit).
          setDrafts((ds) => {
            const empty = ds.findIndex((d) => !d.text.trim());
            if (empty >= 0) return ds.map((d, i) => (i === empty ? { ...d, ...product } : d));
            if (ds.length < MAX_PRODUCTS) return [...ds, { ...emptyDraft(), ...product }];
            return ds.map((d, i) => (i === ds.length - 1 ? { ...d, ...product } : d));
          });
          return;
        }
        // Append to the last product, the one the person is most likely filling in.
        setDrafts((ds) =>
          ds.map((d, i) =>
            i === ds.length - 1
              ? { ...d, text: d.text.trim() ? `${d.text.trim().replace(/[,.]$/, "")}, ${command.name}` : command.name, fromOcr: false, source: undefined }
              : d,
          ),
        );
      }),
    [],
  );

  const update = (key: number, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  // Unnamed products get a localized default name, since names appear in findings.
  const payload = () => ({
    products: drafts.map(({ name, text }, i) => ({ name: name.trim() || fmt(t.checker.productDefault, { n: i + 1 }), text })),
  });

  async function analyze() {
    setLoading(true);
    setError(false);
    setSummary(null);
    try {
      const body = payload();
      let data: Analysis;
      if (isStaticDemo) {
        // Same rules engine, run in the browser.
        const valid = validateProducts(body);
        if (!valid.ok) throw new Error(valid.error);
        data = analyzeProducts(valid.products);
      } else {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        data = json as Analysis;
      }
      setAnalysis(data);
      setChecked(body.products.filter((p) => p.text.trim()));
      requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }));
    } catch (e) {
      setAnalysis(null);
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function requestSummary() {
    setSummary({ loading: true });
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary({ text: data.summary });
    } catch (e) {
      console.error(e);
      setSummary({ error: true });
    }
  }

  async function runOcr(key: number, image: File | string) {
    update(key, { ocr: { progress: 0 }, ocrError: false });
    try {
      const text = await recognizeLabel(image, (progress) => update(key, { ocr: { progress } }));
      update(key, { text: text.trim(), ocr: null, fromOcr: true, source: undefined });
    } catch (e) {
      console.error(e);
      update(key, { ocr: null, ocrError: true });
    }
  }

  function loadSample(id: string) {
    const sample = samples.find((s) => s.id === id);
    if (!sample) return;
    setDrafts(sample.products.map((p) => ({ ...emptyDraft(), name: p.name, text: p.text, source: p.source })));
    setAnalysis(null);
    setSummary(null);
    setError(false);
  }

  const busy = loading || drafts.some((d) => d.ocr);
  const hasText = drafts.some((d) => d.text.trim());

  return (
    <>
      <section className="samples" aria-label={t.checker.samplesAria}>
        <span className="samples-label">{t.checker.samplesLabel}</span>
        {samples.map((s) => (
          <button key={s.id} type="button" className="chip" onClick={() => loadSample(s.id)}>
            {t.checker.samples[s.id as keyof Messages["checker"]["samples"]] ?? s.label}
          </button>
        ))}
      </section>

      <section className="products">
        {drafts.map((d, i) => (
          <ProductEditor
            key={d.key}
            draft={d}
            index={i}
            canRemove={drafts.length > 1}
            onChange={(patch) => update(d.key, patch)}
            onRemove={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
            onImage={(file) => runOcr(d.key, file)}
            onSampleImage={() => runOcr(d.key, `${basePath}/samples/label.png`)}
          />
        ))}
      </section>

      <div className="actions">
        <LoadRoutineButton />
        {drafts.length < MAX_PRODUCTS && (
          <button type="button" className="btn btn-outline" onClick={() => setDrafts((ds) => [...ds, emptyDraft()])}>
            {t.checker.addProduct}
          </button>
        )}
        <button type="button" className="btn btn-rose btn-lg" disabled={busy || !hasText} onClick={analyze}>
          {loading ? t.checker.checking : drafts.length > 1 ? t.checker.checkMany : t.checker.checkOne}
        </button>
      </div>
      {drafts.length === 1 && (
        <p className="hint">{t.checker.routineHint}</p>
      )}
      {error && (
        <p className="error" role="alert">
          {t.checker.error}
        </p>
      )}

      {analysis && (
        <Results analysis={analysis} products={checked} llm={llm} summary={summary} onSummary={requestSummary} />
      )}
    </>
  );
}

function ProductEditor(props: {
  draft: Draft;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
  onImage: (file: File) => void;
  onSampleImage: () => void;
}) {
  const { draft, index } = props;
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="card product">
      <div className="product-head">
        <input
          className="name"
          aria-label={fmt(t.checker.productNameAria, { n: index + 1 })}
          placeholder={fmt(t.checker.productName, { n: index + 1 })}
          value={draft.name}
          onChange={(e) => props.onChange({ name: e.target.value })}
        />
        {props.canRemove && (
          <button type="button" className="link" onClick={props.onRemove}>
            {t.checker.remove}
          </button>
        )}
      </div>
      <label className="sr-only" htmlFor={`${id}-text`}>
        {t.checker.listLabel}
      </label>
      <textarea
        id={`${id}-text`}
        rows={6}
        placeholder={t.checker.placeholder}
        value={draft.text}
        onChange={(e) => props.onChange({ text: e.target.value, fromOcr: false, source: undefined })}
      />
      <div className="ocr-row">
        <label className="btn btn-outline file">
          <Camera size={18} weight="bold" aria-hidden />
          {t.checker.scan}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) props.onImage(file);
              e.target.value = "";
            }}
          />
        </label>
        {index === 0 && (
          <button type="button" className="link" onClick={props.onSampleImage}>
            {t.checker.sampleImage}
          </button>
        )}
      </div>
      {draft.ocr && (
        <div className="progress" role="status">
          <div className="bar" style={{ width: `${Math.round(draft.ocr.progress * 100)}%` }} />
          <span>{fmt(t.checker.reading, { pct: Math.round(draft.ocr.progress * 100) })}</span>
        </div>
      )}
      {draft.ocrError && <p className="error">{t.checker.ocrError}</p>}
      {draft.source && <SourceNote source={draft.source} template={t.checker.sampleSource} />}
      {draft.fromOcr && (
        <p className="hint">{t.checker.ocrHint}</p>
      )}
    </div>
  );
}

function Results(props: {
  analysis: Analysis;
  products: SavedProduct[];
  llm: boolean;
  summary: { text?: string; error?: boolean; loading?: boolean } | null;
  onSummary: () => void;
}) {
  const { analysis, summary } = props;
  const { t } = useI18n();
  const { avoidIds } = useAuth();
  const avoided = avoidMatches(analysis, avoidIds);
  const avoidedKeys = new Set(avoided.map((a) => `${a.product}#${a.name}`));
  const caution = analysis.findings.filter((f) => f.severity === "caution");
  const info = analysis.findings.filter((f) => f.severity === "info");
  const multi = analysis.products.length > 1;

  return (
    <section id="results" className="results" aria-live="polite">
      <h3 className="display-sm">{t.results.title}</h3>
      <p className="muted">
        {fmt(t.results.recognized, { recognized: analysis.stats.recognized, total: analysis.stats.total })}
        {analysis.stats.fuzzy > 0 && ` ${fmt(t.results.fuzzy, { n: analysis.stats.fuzzy })}`}
      </p>
      <EnglishNote />
      {avoided.length > 0 && (
        <div className="card avoid-banner" role="note">
          <strong>{t.save.avoidBanner}</strong>{" "}
          <span lang="en">{avoided.map((a) => (analysis.products.length > 1 ? `${a.name} (${a.product})` : a.name)).join(", ")}</span>
        </div>
      )}
      <CheckActions analysis={analysis} products={props.products} />

      <div className="card summary-card">
        {props.llm ? (
          summary?.text ? (
            <>
              <h4>{t.results.summaryTitle}</h4>
              <p className="summary">{summary.text}</p>
              <p className="fine">{t.results.summaryFine}</p>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-outline" disabled={summary?.loading} onClick={props.onSummary}>
                {summary?.loading ? t.results.summaryLoading : t.results.summaryButton}
              </button>
              {summary?.error && <p className="error">{t.results.summaryError}</p>}
            </>
          )
        ) : (
          <p className="fine">{t.results.summaryOff}</p>
        )}
      </div>

      {analysis.findings.length === 0 ? (
        <div className="card ok">
          <h4>{t.results.noFlagsTitle}</h4>
          <p>{t.results.noFlagsBody}</p>
        </div>
      ) : (
        <>
          {caution.length > 0 && <FindingGroup title={t.results.cautionGroup} findings={caution} multi={multi} />}
          {info.length > 0 && <FindingGroup title={t.results.infoGroup} findings={info} multi={multi} />}
        </>
      )}

      {analysis.products.map((p) => (
        <div key={p.name} className="card">
          <h4 className="product-title">{p.name}</h4>
          <ol className="ingredients">
            {p.ingredients.map((m) => (
              <li key={m.position}>
                <div className="ing-head">
                  <span className="ing-name">{m.raw}</span>
                  {avoidedKeys.has(`${p.name}#${m.raw}`) && <span className="badge avoid">{t.save.avoidBadge}</span>}
                  {m.match && m.match.method !== "exact" && !m.normalized.includes(m.match.matchedOn) && (
                    <span className={`badge ${m.match.method}`} title={fmt(t.results.matchedOn, { name: m.match.matchedOn })}>
                      {m.match.method === "fuzzy" ? fmt(t.results.closeMatch, { name: m.match.ingredient.inci }) : m.match.ingredient.inci}
                    </span>
                  )}
                  {m.match && (
                    <span className="functions" lang="en">
                      {m.match.ingredient.functions.join(", ")}
                    </span>
                  )}
                </div>
                {m.match ? <p lang="en">{m.match.ingredient.description}</p> : <p className="muted">{t.results.notChecked}</p>}
              </li>
            ))}
          </ol>
        </div>
      ))}

      <p className="disclaimer">{t.disclaimer}</p>
    </section>
  );
}

function FindingGroup({ title, findings, multi }: { title: string; findings: Finding[]; multi: boolean }) {
  const { t } = useI18n();
  return (
    <div className="finding-group">
      <h4 className="group-title">{title}</h4>
      {findings.map((f) => (
        <article key={f.ruleId} className={`card finding ${f.severity}`}>
          <h5 lang="en">{f.title}</h5>
          <div className="evidence">
            {f.evidence.map((group, gi) => (
              <span key={gi} className="evidence-group">
                {gi > 0 && <span className="plus">+</span>}
                {group.map((h) => (
                  <HitChip key={`${h.product}-${h.position}`} hit={h} multi={multi} />
                ))}
              </span>
            ))}
          </div>
          {f.kind === "combination" && multi && (
            <p className="fine">
              {f.sameProduct ? t.results.sameProduct : t.results.acrossProducts}
            </p>
          )}
          <p lang="en">{f.explanation}</p>
          <p>
            <strong>{t.results.tip}</strong> <span lang="en">{f.suggestion}</span>
          </p>
          {f.notes.map((n) => (
            <p key={n} className="note" lang="en">
              {n}
            </p>
          ))}
          <details>
            <summary>{fmt(t.results.sources, { n: f.sources.length })}</summary>
            <ul>
              {f.sources.map((s) => (
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
  );
}

function HitChip({ hit, multi }: { hit: Hit; multi: boolean }) {
  const { t } = useI18n();
  return (
    <span className="hit" title={fmt(t.results.position, { position: hit.position, total: hit.total })}>
      {hit.name}
      {multi && <span className="muted"> · {hit.product}</span>}
      {hit.lowInList && <span className="muted"> · {t.results.listedLow}</span>}
    </span>
  );
}

function LoadRoutineButton() {
  const { user } = useAuth();
  const { t } = useI18n();
  if (!user) return null;
  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={() =>
        getRoutine()
          .then((products) => {
            if (products?.length) sendToChecker({ type: "load", products });
          })
          .catch((err) => console.error(err))
      }
    >
      {t.save.loadRoutine}
    </button>
  );
}

/** "Ingredients from {source}, retrieved {date}…" with the source rendered as a link. */
function SourceNote({ source, template }: { source: SampleSource; template: string }) {
  const [before, after = ""] = fmt(template, { date: source.retrieved }).split("{source}");
  return (
    <p className="hint">
      {before}
      <a href={source.url} target="_blank" rel="noreferrer">
        {source.label}
      </a>
      {after}
    </p>
  );
}
