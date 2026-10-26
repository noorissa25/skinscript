"use client";

import { Trash, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { fmt } from "@/i18n/locales";
import { validDisplayName } from "@/lib/account";
import { deleteMyAccount, deleteSavedCheck, getRoutine, listSavedChecks, type SavedCheck } from "@/lib/accountApi";
import { ingredients } from "@/lib/knowledge";
import { isDemoMode } from "@/lib/supabase";
import type { SavedProduct } from "@/lib/account";
import { sendToChecker } from "../checkerBus";
import { useAuth } from "./AuthProvider";

export default function AccountDialog() {
  const auth = useAuth();
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (auth.accountOpen && !dialog.open) dialog.showModal();
    if (!auth.accountOpen && dialog.open) dialog.close();
  }, [auth.accountOpen]);

  if (!auth.configured) return null;

  return (
    <dialog ref={ref} className="account-dialog" aria-labelledby="account-title" onClose={auth.closeAccount}>
      <div className="dialog-head">
        <h2 id="account-title" className="display-sm">
          {t.account.dialogTitle}
        </h2>
        <button type="button" className="icon-button" aria-label={t.account.close} onClick={auth.closeAccount}>
          <X size={24} aria-hidden />
        </button>
      </div>
      {isDemoMode() && <p className="demo-note">{t.account.demoNote}</p>}
      {/* Mount the content only while open, so saved checks and the routine reload every time. */}
      {auth.accountOpen && (auth.user ? <SignedIn /> : <SignInForm />)}
    </dialog>
  );
}

function SignInForm() {
  const { sendSignInLink } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      await sendSignInLink(email);
      setState("sent");
    } catch (err) {
      console.error(err);
      setState("error");
    }
  }

  return (
    <div className="dialog-body">
      <h3>{t.account.signInTitle}</h3>
      <p>{t.account.signInBody}</p>
      {state === "sent" ? (
        <p className="success" role="status">
          {fmt(t.account.linkSent, { email })}
        </p>
      ) : (
        <form onSubmit={submit} className="stack">
          <label htmlFor={`${id}-email`} className="field-label">
            {t.account.emailLabel}
          </label>
          <input
            id={`${id}-email`}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-input"
          />
          <button type="submit" className="btn btn-rose" disabled={state === "sending"}>
            {state === "sending" ? t.account.sending : t.account.sendLink}
          </button>
          {state === "error" && (
            <p className="error" role="alert">
              {t.account.linkError}
            </p>
          )}
        </form>
      )}
      <p className="fine">{t.account.privacyNote}</p>
    </div>
  );
}

function SignedIn() {
  const auth = useAuth();
  const { t } = useI18n();
  return (
    <div className="dialog-body">
      <p className="fine">{auth.user?.email}</p>
      <DisplayNameForm />
      <SavedChecks />
      <Routine />
      <AvoidList />
      <p className="fine">{t.account.privacyNote}</p>
      <DangerZone />
    </div>
  );
}

function DisplayNameForm() {
  const { displayName, updateDisplayName } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState(displayName ?? "");
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const id = useId();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the field once the saved name loads
    setName(displayName ?? "");
  }, [displayName]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validDisplayName(name)) return;
    try {
      await updateDisplayName(name);
      setState("saved");
    } catch (err) {
      console.error(err);
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="stack account-block">
      <label htmlFor={`${id}-name`} className="field-label">
        {t.account.displayNameLabel}
      </label>
      <div className="inline-field">
        <input
          id={`${id}-name`}
          className="text-input"
          value={name}
          minLength={2}
          maxLength={30}
          required
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            setName(e.target.value);
            setState("idle");
          }}
        />
        <button type="submit" className="btn btn-outline" disabled={!validDisplayName(name)}>
          {t.account.saveName}
        </button>
      </div>
      <p id={`${id}-help`} className="fine">
        {t.account.displayNameHelp}
      </p>
      {state === "saved" && (
        <p className="success" role="status">
          {t.account.nameSaved}
        </p>
      )}
      {state === "error" && (
        <p className="error" role="alert">
          {t.account.genericError}
        </p>
      )}
    </form>
  );
}

function SavedChecks() {
  const { t, locale } = useI18n();
  const { closeAccount } = useAuth();
  const [checks, setChecks] = useState<SavedCheck[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    listSavedChecks()
      .then(setChecks)
      .catch((err) => {
        console.error(err);
        setError(true);
      });
  }, []);

  async function remove(id: string) {
    const before = checks;
    setChecks((cs) => cs?.filter((c) => c.id !== id) ?? null);
    try {
      await deleteSavedCheck(id);
    } catch (err) {
      console.error(err);
      setChecks(before);
    }
  }

  return (
    <section className="account-block" aria-labelledby="saved-title">
      <h3 id="saved-title">{t.account.savedTitle}</h3>
      {error && <p className="error">{t.account.genericError}</p>}
      {checks && checks.length === 0 && <p className="fine">{t.account.savedEmpty}</p>}
      {checks && checks.length > 0 && (
        <ul className="saved-list">
          {checks.map((c) => (
            <li key={c.id}>
              <div className="saved-text">
                <span className="saved-title" lang="en">
                  {c.title}
                </span>
                <span className="fine">
                  {new Date(c.created_at).toLocaleDateString(locale)} · {fmt(t.account.flags, { n: c.summary.findings.length })}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  sendToChecker({ type: "load", products: c.products });
                  closeAccount();
                }}
              >
                {t.account.open}
              </button>
              <button type="button" className="icon-button" aria-label={`${t.account.delete}: ${c.title}`} onClick={() => remove(c.id)}>
                <Trash size={20} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Routine() {
  const { t } = useI18n();
  const { closeAccount } = useAuth();
  const [routine, setRoutine] = useState<SavedProduct[] | null | undefined>(undefined);

  useEffect(() => {
    getRoutine()
      .then(setRoutine)
      .catch((err) => {
        console.error(err);
        setRoutine(null);
      });
  }, []);

  return (
    <section className="account-block" aria-labelledby="routine-title-acct">
      <h3 id="routine-title-acct">{t.account.routineTitle}</h3>
      {routine === null && <p className="fine">{t.account.routineEmpty}</p>}
      {routine && (
        <div className="routine-row">
          <ul className="routine-products" lang="en">
            {routine.map((p, i) => (
              <li key={i}>{p.name}</li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              sendToChecker({ type: "load", products: routine });
              closeAccount();
            }}
          >
            {t.account.routineLoad}
          </button>
        </div>
      )}
    </section>
  );
}

const INGREDIENT_OPTIONS = ingredients.map((i) => ({ id: i.id, name: i.inci }));

function AvoidList() {
  const { avoidIds, toggleAvoid } = useAuth();
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const id = useId();

  async function add(e: FormEvent) {
    e.preventDefault();
    const match = INGREDIENT_OPTIONS.find((o) => o.name.toLowerCase() === value.trim().toLowerCase());
    if (!match) {
      setError(true);
      return;
    }
    setError(false);
    setValue("");
    if (!avoidIds.has(match.id)) await toggleAvoid(match.id).catch(() => setError(true));
  }

  const chosen = INGREDIENT_OPTIONS.filter((o) => avoidIds.has(o.id));
  return (
    <section className="account-block" aria-labelledby="avoid-title">
      <h3 id="avoid-title">{t.account.avoidTitle}</h3>
      <p className="fine">{t.account.avoidHelp}</p>
      <form onSubmit={add} className="inline-field">
        <label htmlFor={`${id}-avoid`} className="sr-only">
          {t.account.avoidTitle}
        </label>
        <input
          id={`${id}-avoid`}
          className="text-input"
          list={`${id}-options`}
          placeholder={t.account.avoidPlaceholder}
          value={value}
          aria-invalid={error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
        />
        <datalist id={`${id}-options`}>
          {INGREDIENT_OPTIONS.map((o) => (
            <option key={o.id} value={o.name} />
          ))}
        </datalist>
        <button type="submit" className="btn btn-outline">
          {t.account.avoidAdd}
        </button>
      </form>
      {error && (
        <p id={`${id}-error`} className="error">
          {t.account.avoidUnknown}
        </p>
      )}
      {chosen.length === 0 ? (
        <p className="fine">{t.account.avoidEmpty}</p>
      ) : (
        <ul className="avoid-chips" lang="en">
          {chosen.map((o) => (
            <li key={o.id}>
              {o.name}
              <button type="button" className="chip-remove" aria-label={fmt(t.account.avoidRemove, { name: o.name })} onClick={() => toggleAvoid(o.id)}>
                <X size={14} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DangerZone() {
  const { signOut, closeAccount } = useAuth();
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="account-block danger-zone">
      <button type="button" className="btn btn-outline" onClick={() => signOut().then(closeAccount)}>
        {t.account.signOut}
      </button>
      {!confirming ? (
        <button type="button" className="link danger-link" onClick={() => setConfirming(true)}>
          {t.account.deleteAccount}
        </button>
      ) : (
        <div className="confirm-box" role="alertdialog" aria-labelledby="delete-confirm">
          <p id="delete-confirm">{t.account.deleteConfirm}</p>
          <div className="inline-actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() =>
                deleteMyAccount()
                  .then(closeAccount)
                  .catch((err) => {
                    console.error(err);
                    setError(true);
                  })
              }
            >
              {t.account.deleteConfirmButton}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setConfirming(false)}>
              {t.account.cancel}
            </button>
          </div>
          {error && <p className="error">{t.account.genericError}</p>}
        </div>
      )}
    </div>
  );
}
