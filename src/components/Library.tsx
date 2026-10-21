"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OwnedGame } from "@/lib/steam";
import { isBuiltIn, type Collection, type ImportResult } from "@/lib/collections";
import CollectionsImport from "@/components/CollectionsImport";
import ListEditor from "@/components/ListEditor";
import { isCustomList, loadLists, newListId, saveLists } from "@/lib/lists";
import { addToHistory } from "@/lib/history";
import { HOUR_LIMITS, matchesLimit, type HourLimit } from "@/lib/limits";
import { STEAM_CDN as CDN, gameIconUrl } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";

type Status = "loading" | "ready" | "private" | "error";

const RECENT_LIMIT = 5;
const ALL = "__all__";

const storageKey = (steamId: string) => `sorteador-colecoes:${steamId}`;

function loadCollections(steamId: string): Collection[] {
  try {
    const raw = localStorage.getItem(storageKey(steamId));
    return raw ? (JSON.parse(raw) as Collection[]) : [];
  } catch {
    return [];
  }
}

function saveCollections(steamId: string, collections: Collection[]) {
  try {
    if (collections.length) localStorage.setItem(storageKey(steamId), JSON.stringify(collections));
    else localStorage.removeItem(storageKey(steamId));
  } catch {
    // Storage blocked: collections still work until the page is reloaded.
  }
}

export default function Library({ steamId }: { steamId: string }) {
  const { t, rich, format } = useI18n();
  const [status, setStatus] = useState<Status>("loading");
  const [games, setGames] = useState<OwnedGame[]>([]);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState<HourLimit>("any");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState(ALL);
  const [lists, setLists] = useState<Collection[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [editor, setEditor] = useState<{ list: Collection | null } | null>(null);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const [current, setCurrent] = useState<OwnedGame | null>(null);
  const [rolling, setRolling] = useState(false);
  const [revealKey, setRevealKey] = useState(0);
  const recent = useRef<number[]>([]);

  const load = useCallback(async (refresh = false) => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/games${refresh ? "?refresh=1" : ""}`);
      if (res.status === 401) return window.location.reload();
      if (res.status === 403) return setStatus("private");
      if (!res.ok) return setStatus("error");
      const data = (await res.json()) as { games: OwnedGame[] };
      setGames(data.games);
      setCurrent((c) => c ?? data.games[Math.floor(Math.random() * data.games.length)] ?? null);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
    setCollections(loadCollections(steamId));
    setLists(loadLists(steamId));
  }, [load, steamId]);

  const collectionName = useCallback(
    (c: Collection) => (isBuiltIn(c.id) ? t(`collections.${c.id}`) : c.name),
    [t],
  );

  const sortedGames = useMemo(() => [...games].sort((a, b) => format.compare(a.name, b.name)), [games, format]);
  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => format.compare(collectionName(a), collectionName(b))),
    [collections, collectionName, format],
  );
  const sortedLists = useMemo(() => [...lists].sort((a, b) => format.compare(a.name, b.name)), [lists, format]);
  const allCollections = useMemo(() => [...lists, ...collections], [lists, collections]);

  const owned = useMemo(() => new Set(games.map((g) => g.appid)), [games]);

  // Only count games the user still owns; collections can list removed or family-shared apps.
  const collectionCounts = useMemo(
    () => new Map(allCollections.map((c) => [c.id, c.appids.filter((id) => owned.has(id)).length])),
    [allCollections, owned],
  );

  const selected = allCollections.find((c) => c.id === collectionId);
  const selectedName = selected ? collectionName(selected) : t("library.allGames");

  const pool = useMemo(() => {
    const inCollection = selected ? new Set(selected.appids) : null;
    return sortedGames.filter(
      (g) => (!inCollection || inCollection.has(g.appid)) && matchesLimit(g.playtime_forever, limit),
    );
  }, [sortedGames, limit, selected]);

  function handleImported(result: ImportResult) {
    setCollections(result.collections);
    saveCollections(steamId, result.collections);
    setCollectionId((id) => (isCustomList(id) ? id : ALL));
    setLastImport(result);
  }

  function clearCollections() {
    setCollections([]);
    saveCollections(steamId, []);
    setCollectionId((id) => (isCustomList(id) ? id : ALL));
    setLastImport(null);
  }

  function saveList(name: string, appids: number[]) {
    const id = editor?.list?.id ?? newListId();
    const next = [...lists.filter((l) => l.id !== id), { id, name, appids }];
    setLists(next);
    saveLists(steamId, next);
    setCollectionId(id);
  }

  function deleteList() {
    const id = editor?.list?.id;
    if (!id) return;
    const next = lists.filter((l) => l.id !== id);
    setLists(next);
    saveLists(steamId, next);
    setCollectionId((c) => (c === id ? ALL : c));
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? pool.filter((g) => g.name.toLowerCase().includes(q)) : pool;
  }, [pool, query]);

  const roll = useCallback(() => {
    if (rolling || pool.length === 0) return;
    const fresh = pool.filter((g) => !recent.current.includes(g.appid));
    const candidates = fresh.length ? fresh : pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    recent.current = [pick.appid, ...recent.current].slice(0, Math.min(RECENT_LIMIT, pool.length - 1));
    const collection = selected ? { id: selected.id, name: selected.name } : undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = reduced ? 0 : 16;
    let n = 0;
    setRolling(true);
    const tick = () => {
      if (n++ < steps) {
        setCurrent(pool[Math.floor(Math.random() * pool.length)]);
        setTimeout(tick, 35 + n * n * 1.1);
      } else {
        setCurrent(pick);
        setRolling(false);
        setRevealKey((k) => k + 1);
        addToHistory(steamId, {
          appid: pick.appid,
          name: pick.name,
          playtime_forever: pick.playtime_forever,
          collection,
          limit,
          at: Date.now(),
        });
      }
    };
    tick();
  }, [pool, rolling, selected, limit, steamId]);

  if (status === "loading" && games.length === 0) {
    return <main className="state">{t("library.loading")}</main>;
  }
  if (status === "private") {
    return (
      <main className="state">
        <h2>{t("library.private.title")}</h2>
        <p>{rich("library.private.text")}</p>
        <a className="btn-blue" href="https://steamcommunity.com/my/edit/settings" target="_blank" rel="noreferrer">
          {t("library.private.openSettings")}
        </a>
        <button className="btn-ghost" onClick={() => load(true)}>
          {t("library.private.retry")}
        </button>
      </main>
    );
  }
  if (status === "error") {
    return (
      <main className="state">
        <h2>{t("library.steamDown.title")}</h2>
        <p>{t("library.steamDown.text")}</p>
        <button className="btn-blue" onClick={() => load(true)}>
          {t("library.steamDown.retry")}
        </button>
      </main>
    );
  }
  if (games.length === 0) {
    return (
      <main className="state">
        <h2>{t("library.empty.title")}</h2>
        <p>{t("library.empty.text")}</p>
      </main>
    );
  }

  return (
    <div className="body">
      <aside className="side">
        {allCollections.length > 0 && (
          <select
            id="colecao"
            className="collection-select"
            aria-label={t("library.collectionLabel")}
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
          >
            <option value={ALL}>{t("library.optionWithCount", { name: t("library.allGames"), count: games.length })}</option>
            {sortedLists.length > 0 && (
              <optgroup label={t("library.groupLists")}>
                {sortedLists.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t("library.optionWithCount", { name: c.name, count: collectionCounts.get(c.id) ?? 0 })}
                  </option>
                ))}
              </optgroup>
            )}
            {sortedCollections.length > 0 && (
              <optgroup label={t("library.groupSteam")}>
                {sortedCollections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t("library.optionWithCount", { name: collectionName(c), count: collectionCounts.get(c.id) ?? 0 })}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
        <input
          id="busca"
          className="search"
          type="search"
          placeholder={t("library.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="list-actions">
          <button type="button" onClick={() => setEditor({ list: null })}>
            {t("library.createList")}
          </button>
          {selected && isCustomList(selected.id) && (
            <button type="button" onClick={() => setEditor({ list: selected })}>
              {t("library.editList")}
            </button>
          )}
        </div>
        <div className="cat">
          {t(limit === "any" ? "library.listHeading" : "library.listHeadingFiltered", {
            name: selectedName,
            count: visible.length,
          })}
        </div>
        <ul className="list">
          {visible.map((g) => (
            <li key={g.appid}>
              <button className={g.appid === current?.appid ? "on" : ""} onClick={() => setCurrent(g)}>
                {g.img_icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={gameIconUrl(g.appid, g.img_icon_url)}
                    alt=""
                    width={16}
                    height={16}
                    loading="lazy"
                  />
                ) : (
                  <span className="icon-ph" />
                )}
                <span className="name">{g.name}</span>
                <em>{g.playtime_forever ? format.playtime(g.playtime_forever) : ""}</em>
              </button>
            </li>
          ))}
        </ul>
        <div className="side-foot">
          {lastImport && (
            <p role="status">
              {t("library.imported", { count: lastImport.collections.length })}
              {lastImport.dynamicSkipped > 0 && ` ${t("library.dynamicSkipped", { count: lastImport.dynamicSkipped })}`}
            </p>
          )}
          <button type="button" onClick={() => setImportOpen(true)}>
            {collections.length ? t("library.updateCollections") : t("library.importCollections")}
          </button>
        </div>
        <CollectionsImport
          steamId={steamId}
          open={importOpen}
          hasImported={collections.length > 0}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
          onClear={clearCollections}
        />
        <ListEditor
          open={editor !== null}
          games={sortedGames}
          list={editor?.list ?? null}
          defaultName={t("lists.defaultName", { n: lists.length + 1 })}
          onClose={() => setEditor(null)}
          onSave={saveList}
          onDelete={deleteList}
        />
      </aside>

      <main className="main">
        {current && (
          <>
            <Hero key={current.appid} game={current} revealKey={revealKey} rolling={rolling} />
            <div className="bar">
              <button className="btn-roll" onClick={roll} disabled={rolling || pool.length === 0}>
                {rolling ? t("library.rolling") : t("library.roll")}
              </button>
              <a className="btn-play" href={`steam://run/${current.appid}`}>
                {t("library.play")}
              </a>
              <div className="stat">
                <b>{t("library.playtime")}</b>
                <span>{format.playtime(current.playtime_forever)}</span>
              </div>
              <div className="stat">
                <b>{t("library.lastSession")}</b>
                <span>{format.lastPlayed(current.rtime_last_played)}</span>
              </div>
              <label className="filter" htmlFor="limite">
                {t("library.drawFrom")}
                <select id="limite" value={limit} onChange={(e) => setLimit(e.target.value as HourLimit)}>
                  {HOUR_LIMITS.map((l) => (
                    <option key={l} value={l}>
                      {t(`limits.${l}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {pool.length === 0 && (
              <p className="empty">
                {selected ? t("library.noMatchInCollection", { name: selectedName }) : t("library.noMatch")}
              </p>
            )}
            <div className="tags">
              {!!current.playtime_2weeks && (
                <span>{t("library.lastTwoWeeks", { time: format.playtime(current.playtime_2weeks) })}</span>
              )}
              <a href={`https://store.steampowered.com/app/${current.appid}`} target="_blank" rel="noreferrer">
                {t("library.store")}
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Hero({ game, revealKey, rolling }: { game: OwnedGame; revealKey: number; rolling: boolean }) {
  // library_hero is missing for some games; fall back to the store header, then to a plain gradient.
  const sources = [`${CDN}/${game.appid}/library_hero.jpg`, `${CDN}/${game.appid}/header.jpg`];
  const [idx, setIdx] = useState(0);

  return (
    <div className={`hero${rolling ? " rolling" : ""}`}>
      {idx < sources.length && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sources[idx]} alt="" onError={() => setIdx((i) => i + 1)} />
      )}
      <h1 key={revealKey} className="hero-name">
        {game.name}
      </h1>
    </div>
  );
}
