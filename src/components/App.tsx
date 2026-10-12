"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlayerSummary } from "@/lib/steam";
import { useI18n } from "@/i18n/I18nProvider";
import TopBar from "@/components/TopBar";
import Library from "@/components/Library";
import History from "@/components/History";

type Tab = "biblioteca" | "sorteados";
type Me = { steamId: string; profile: PlayerSummary | null };
type State = { status: "loading" } | { status: "guest"; loginFailed: boolean } | { status: "error" } | ({ status: "in" } & Me);

// The pages are static (served by the CDN); the session is checked here through /api/me.
export default function App({ tab }: { tab: Tab }) {
  const router = useRouter();
  const { t } = useI18n();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          if (tab !== "biblioteca") return router.replace("/");
          const loginFailed = new URLSearchParams(window.location.search).get("erro") === "login";
          return setState({ status: "guest", loginFailed });
        }
        if (!res.ok) return setState({ status: "error" });
        setState({ status: "in", ...((await res.json()) as Me) });
      })
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [tab, router]);

  return (
    <div className="app">
      <TopBar profile={state.status === "in" ? state.profile : undefined} active={state.status === "in" ? tab : undefined} />
      {state.status === "loading" && <main className="state">{t("app.loading")}</main>}
      {state.status === "error" && (
        <main className="state">
          <h2>{t("app.loadErrorTitle")}</h2>
          <p>{t("app.loadErrorText")}</p>
          <button className="btn-blue" onClick={() => window.location.reload()}>
            {t("app.reload")}
          </button>
        </main>
      )}
      {state.status === "guest" && <Login failed={state.loginFailed} />}
      {state.status === "in" &&
        (tab === "biblioteca" ? <Library steamId={state.steamId} /> : <History steamId={state.steamId} />)}
      <footer className="footer">{t("app.footer")}</footer>
    </div>
  );
}

function Login({ failed }: { failed: boolean }) {
  const { t } = useI18n();
  return (
    <main className="login">
      <div className="login-card">
        <h1>{t("login.title")}</h1>
        <p>{t("login.text")}</p>
        {failed && <p className="login-error">{t("login.failed")}</p>}
        <a className="btn-steam" href="/api/auth/steam">
          {t("login.button")}
        </a>
        <small>{t("login.note")}</small>
      </div>
    </main>
  );
}
