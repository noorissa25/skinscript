"use client";

import { BookmarkSimple, ChatsCircle, ListChecks } from "@phosphor-icons/react";
import { useState } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { checkTitle, shareCard, summarize, type SavedProduct } from "@/lib/account";
import { postMessage, saveCheck, saveRoutine } from "@/lib/accountApi";
import type { Analysis } from "@/lib/types";
import { useAuth } from "./AuthProvider";

type Status = "idle" | "saved" | "routine" | "confirmShare" | "shared" | "error" | "rate";

/** Save / routine / share buttons under a result. Hidden when accounts aren't configured. */
export default function CheckActions({ analysis, products }: { analysis: Analysis; products: SavedProduct[] }) {
  const { configured, user, displayName, openAccount } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("idle");

  if (!configured) return null;
  if (!user) {
    return (
      <div className="check-actions">
        <button type="button" className="link" onClick={openAccount}>
          {t.save.signInToSave}
        </button>
      </div>
    );
  }

  const run = (fn: () => Promise<void>, done: Status) =>
    fn()
      .then(() => setStatus(done))
      .catch((err: Error) => {
        console.error(err);
        setStatus(/too fast/i.test(err.message) ? "rate" : "error");
      });

  return (
    <div className="check-actions">
      <div className="inline-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => saveCheck(checkTitle(products), products, summarize(analysis)), "saved")}>
          <BookmarkSimple size={18} aria-hidden /> {t.save.save}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => saveRoutine(user.id, products), "routine")}>
          <ListChecks size={18} aria-hidden /> {t.save.saveRoutine}
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => (displayName ? setStatus("confirmShare") : openAccount())}
        >
          <ChatsCircle size={18} aria-hidden /> {t.save.share}
        </button>
      </div>
      {status === "confirmShare" && (
        <div className="confirm-box">
          <p>{t.save.shareConfirm}</p>
          <div className="inline-actions">
            <button
              type="button"
              className="btn btn-rose btn-sm"
              onClick={() => run(() => postMessage(checkTitle(products), shareCard(products, analysis)), "shared")}
            >
              {t.save.shareButton}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus("idle")}>
              {t.account.cancel}
            </button>
          </div>
        </div>
      )}
      <p role="status" className={status === "error" || status === "rate" ? "error" : "success"}>
        {status === "saved" && t.save.saved}
        {status === "routine" && t.save.routineSaved}
        {status === "shared" && (
          <>
            {t.save.shared} · <a href="#community">{t.community.title}</a>
          </>
        )}
        {status === "rate" && t.community.rateLimited}
        {status === "error" && t.account.genericError}
      </p>
    </div>
  );
}
