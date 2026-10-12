"use client";

import Link from "next/link";
import type { PlayerSummary } from "@/lib/steam";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoutButton from "@/components/LogoutButton";

type Tab = "biblioteca" | "sorteados";

export default function TopBar({ profile, active }: { profile?: PlayerSummary | null; active?: Tab }) {
  const { t } = useI18n();
  return (
    <header className="topbar">
      <div className="logo">
        <i aria-hidden="true" />
        {t("app.name")}
      </div>
      {active && (
        <nav className="topnav">
          <Link href="/" className={active === "biblioteca" ? "on" : ""} aria-current={active === "biblioteca" ? "page" : undefined}>
            {t("nav.library")}
          </Link>
          <Link href="/sorteados" className={active === "sorteados" ? "on" : ""} aria-current={active === "sorteados" ? "page" : undefined}>
            {t("nav.drawn")}
          </Link>
        </nav>
      )}
      <div className="top-right">
        <LanguageSwitcher />
        {profile && (
          <div className="user">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="avatar" src={profile.avatarfull} alt="" width={32} height={32} />
            <div>
              <a href={profile.profileurl} target="_blank" rel="noreferrer">
                {profile.personaname}
              </a>
              <LogoutButton />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
