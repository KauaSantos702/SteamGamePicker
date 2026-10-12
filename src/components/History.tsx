"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearHistory, loadHistory, type DrawnGame } from "@/lib/history";
import { isBuiltIn } from "@/lib/collections";
import { STEAM_CDN } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";

export default function History({ steamId }: { steamId: string }) {
  const { t, format } = useI18n();
  const [entries, setEntries] = useState<DrawnGame[] | null>(null);

  useEffect(() => setEntries(loadHistory(steamId)), [steamId]);

  function source(e: DrawnGame) {
    if (e.from) return e.from;
    const where = e.collection
      ? isBuiltIn(e.collection.id)
        ? t(`collections.${e.collection.id}`)
        : e.collection.name
      : t("library.allGames");
    return e.limit && e.limit !== "any" ? `${where} · ${t(`limits.${e.limit}`)}` : where;
  }

  if (entries === null) return <main className="state">{t("app.loading")}</main>;

  if (entries.length === 0) {
    return (
      <main className="state">
        <h2>{t("history.emptyTitle")}</h2>
        <p>{t("history.emptyText")}</p>
        <Link className="btn-blue" href="/">
          {t("history.goToLibrary")}
        </Link>
      </main>
    );
  }

  return (
    <main className="history">
      <div className="history-head">
        <div>
          <h1>{t("history.title")}</h1>
          <p>{t("history.summary", { count: entries.length })}</p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            clearHistory(steamId);
            setEntries([]);
          }}
        >
          {t("history.clear")}
        </button>
      </div>

      <ol className="history-list">
        {entries.map((e, i) => (
          <li key={`${e.at}-${e.appid}`} className="history-row">
            <span className="history-n">#{entries.length - i}</span>
            <Thumb appid={e.appid} />
            <div className="history-info">
              <h2>{e.name}</h2>
              <p>
                {format.drawnAt(e.at)} · {t("history.from", { source: source(e) })}
              </p>
            </div>
            <div className="stat">
              <b>{t("library.playtime")}</b>
              <span>{format.playtime(e.playtime_forever)}</span>
            </div>
            <div className="history-actions">
              <a className="btn-play" href={`steam://run/${e.appid}`}>
                {t("library.play")}
              </a>
              <a href={`https://store.steampowered.com/app/${e.appid}`} target="_blank" rel="noreferrer">
                {t("history.store")}
              </a>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}

function Thumb({ appid }: { appid: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="history-thumb" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="history-thumb"
      src={`${STEAM_CDN}/${appid}/header.jpg`}
      alt=""
      width={184}
      height={86}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
