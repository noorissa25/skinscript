"use client";

import { ChatsCircle, Flag, Info, Trash, Warning } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { fmt } from "@/i18n/locales";
import { CHAT_MAX_LENGTH, validChatBody } from "@/lib/account";
import { deleteMessage, postMessage, recentMessages, reportMessage, subscribeToChat, type ChatMessage } from "@/lib/accountApi";
import { useAuth } from "./AuthProvider";

export default function CommunityChat() {
  const { configured, ready } = useAuth();
  const { t } = useI18n();
  return (
    <section className="section" id="community" aria-labelledby="community-title">
      <div className="section-head">
        <h2 id="community-title" className="display-rose">
          {t.community.title}
        </h2>
        <p className="section-sub">{t.community.sub}</p>
      </div>
      <div className="chat-shell">
        {configured ? (
          ready ? <Chat /> : <div className="card chat" aria-busy="true" />
        ) : (
          <p className="card chat-off">
            <Info size={20} aria-hidden /> {t.community.notConfigured}
          </p>
        )}
      </div>
    </section>
  );
}

function Chat() {
  const { user, displayName, openAccount } = useAuth();
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reported, setReported] = useState<Set<number>>(new Set());
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    let cancelled = false;
    recentMessages()
      .then((m) => !cancelled && setMessages(m))
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoadError(true);
      });
    const unsubscribe = subscribeToChat(
      (m) => setMessages((ms) => (ms && !ms.some((x) => x.id === m.id) ? [...ms, m].slice(-100) : ms)),
      (id) => setMessages((ms) => ms?.filter((m) => m.id !== id) ?? ms),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Keep the newest message in view, like any chat.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages?.length]);

  const time = (iso: string) =>
    new Date(iso).toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="card chat">
      <p className="chat-rules">
        <Info size={18} aria-hidden /> {t.community.rules}
      </p>
      {loadError && <p className="error">{t.community.loadError}</p>}
      {messages && messages.length === 0 && <p className="chat-empty">{t.community.empty}</p>}
      {messages && messages.length > 0 && (
        <ol className="chat-list" ref={listRef} aria-live="polite" aria-relevant="additions" tabIndex={0} aria-label={t.community.title}>
          {messages.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <li key={m.id} className={`chat-message${mine ? " mine" : ""}`}>
                <div className="chat-meta">
                  <span className="chat-name">
                    {m.display_name}
                    {mine && <span className="muted"> ({t.community.you})</span>}
                  </span>
                  <time dateTime={m.created_at} className="muted">
                    {time(m.created_at)}
                  </time>
                </div>
                {m.shared_check ? (
                  <div className="shared-check">
                    <p className="shared-label">
                      <ChatsCircle size={16} aria-hidden /> {t.community.sharedCheck}
                    </p>
                    <p className="shared-title" lang="en">
                      {m.shared_check.title}
                    </p>
                    {m.shared_check.findings.length === 0 ? (
                      <p className="fine">{t.community.noFlags}</p>
                    ) : (
                      <ul className="shared-flags" lang="en">
                        {m.shared_check.findings.map((f, i) => (
                          <li key={i} className={`sev-pill sev-pill-${f.severity}`}>
                            {f.severity === "caution" ? <Warning size={14} weight="bold" aria-hidden /> : <Info size={14} weight="bold" aria-hidden />}
                            {f.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="chat-body">{m.body}</p>
                )}
                {user && (
                  <div className="chat-tools">
                    {mine ? (
                      <button
                        type="button"
                        className="link small"
                        onClick={() => deleteMessage(m.id).then(() => setMessages((ms) => ms?.filter((x) => x.id !== m.id) ?? ms))}
                      >
                        <Trash size={14} aria-hidden /> {t.community.delete}
                      </button>
                    ) : reported.has(m.id) ? (
                      <span className="fine">{t.community.reported}</span>
                    ) : (
                      <button
                        type="button"
                        className="link small"
                        onClick={() => reportMessage(m.id).then(() => setReported((r) => new Set(r).add(m.id)))}
                      >
                        <Flag size={14} aria-hidden /> {t.community.report}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {!user ? (
        <button type="button" className="btn btn-rose" onClick={openAccount}>
          {t.community.signInToPost}
        </button>
      ) : !displayName ? (
        <button type="button" className="btn btn-outline" onClick={openAccount}>
          {t.community.needName}
        </button>
      ) : (
        <Composer />
      )}
    </div>
  );
}

function Composer() {
  const { t } = useI18n();
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "posting" | "error" | "rate">("idle");
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validChatBody(body)) return;
    setState("posting");
    try {
      await postMessage(body);
      setBody("");
      setState("idle");
    } catch (err) {
      console.error(err);
      setState(/too fast/i.test((err as Error).message) ? "rate" : "error");
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <label htmlFor={`${id}-msg`} className="sr-only">
        {t.community.messageLabel}
      </label>
      <textarea
        id={`${id}-msg`}
        rows={2}
        maxLength={CHAT_MAX_LENGTH}
        placeholder={t.community.placeholder}
        value={body}
        aria-describedby={`${id}-count`}
        onChange={(e) => {
          setBody(e.target.value);
          if (state !== "posting") setState("idle");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
        }}
      />
      <div className="composer-row">
        <span id={`${id}-count`} className="fine">
          {fmt(t.community.counter, { n: body.length, max: CHAT_MAX_LENGTH })}
        </span>
        <button type="submit" className="btn btn-rose btn-sm" disabled={state === "posting" || !validChatBody(body)}>
          {state === "posting" ? t.community.posting : t.community.post}
        </button>
      </div>
      {(state === "error" || state === "rate") && (
        <p className="error" role="alert">
          {state === "rate" ? t.community.rateLimited : t.community.postError}
        </p>
      )}
    </form>
  );
}
