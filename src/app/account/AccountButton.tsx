"use client";

import { UserCircle } from "@phosphor-icons/react";
import { useI18n } from "@/i18n/LocaleProvider";
import { useAuth } from "./AuthProvider";

export default function AccountButton() {
  const { configured, ready, user, openAccount } = useAuth();
  const { t } = useI18n();
  if (!configured || !ready) return null;
  return (
    <button type="button" className="account-button" onClick={openAccount} aria-haspopup="dialog">
      <UserCircle size={22} weight={user ? "fill" : "bold"} aria-hidden />
      <span className="account-label">{user ? t.account.myAccount : t.account.signIn}</span>
    </button>
  );
}
