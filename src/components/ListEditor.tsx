"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Collection } from "@/lib/collections";
import type { OwnedGame } from "@/lib/steam";
import { gameIconUrl } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  open: boolean;
  /** Games of the library, already sorted by name. */
  games: OwnedGame[];
  /** The list being edited; null creates a new one. */
  list: Collection | null;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string, appids: number[]) => void;
  onDelete: () => void;
};

export default function ListEditor({ open, games, list, defaultName, onClose, onSave, onDelete }: Props) {
  const { t, format } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setName(list?.name ?? "");
      setQuery("");
      setOnlySelected(false);
      setPicked(new Set(list?.appids));
      setConfirmDelete(false);
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open, list]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((g) => (!onlySelected || picked.has(g.appid)) && (!q || g.name.toLowerCase().includes(q)));
  }, [games, query, onlySelected, picked]);

  // Count only owned games: an edited list may still hold apps that left the library.
  const count = useMemo(() => games.filter((g) => picked.has(g.appid)).length, [games, picked]);

  function toggle(appid: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(appid)) next.add(appid);
      return next;
    });
  }

  function setVisible(checked: boolean) {
    setPicked((prev) => {
      const next = new Set(prev);
      for (const g of visible) {
        if (checked) next.add(g.appid);
        else next.delete(g.appid);
      }
      return next;
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (count === 0) return;
    onSave(name.trim() || defaultName, [...picked]);
    onClose();
  }

  return (
    <dialog ref={dialog} className="dialog dialog-wide" onClose={onClose} aria-labelledby="list-title">
      <form className="list-editor" onSubmit={save}>
        <h2 id="list-title">{list ? t("lists.editTitle") : t("lists.createTitle")}</h2>
        <p>{t("lists.intro")}</p>

        <label className="field">
          <span>{t("lists.name")}</span>
          <input className="search" value={name} placeholder={defaultName} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="picker-tools">
          <input
            className="search"
            type="search"
            aria-label={t("lists.search")}
            placeholder={t("lists.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="check">
            <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} />
            {t("lists.onlySelected")}
          </label>
        </div>

        <div className="picker-head">
          <span role="status">{t("lists.selected", { count })}</span>
          <span>
            <button type="button" className="link-btn" onClick={() => setVisible(true)} disabled={visible.length === 0}>
              {t("lists.selectVisible")}
            </button>
            <button type="button" className="link-btn" onClick={() => setVisible(false)} disabled={visible.length === 0}>
              {t("lists.clearVisible")}
            </button>
          </span>
        </div>

        <ul className="picker">
          {visible.map((g) => (
            <li key={g.appid}>
              <label className={picked.has(g.appid) ? "on" : ""}>
                <input type="checkbox" checked={picked.has(g.appid)} onChange={() => toggle(g.appid)} />
                {g.img_icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={gameIconUrl(g.appid, g.img_icon_url)} alt="" width={16} height={16} loading="lazy" />
                ) : (
                  <span className="icon-ph" />
                )}
                <span className="name">{g.name}</span>
                <em>{g.playtime_forever ? format.playtime(g.playtime_forever) : ""}</em>
              </label>
            </li>
          ))}
          {visible.length === 0 && <li className="picker-empty">{t("lists.noResults")}</li>}
        </ul>

        <div className="dialog-actions">
          {list && (
            <button
              type="button"
              className="btn-ghost btn-danger"
              onClick={() => (confirmDelete ? (onDelete(), onClose()) : setConfirmDelete(true))}
            >
              {confirmDelete ? t("lists.confirmDelete") : t("lists.delete")}
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("lists.cancel")}
          </button>
          <button type="submit" className="btn-blue" disabled={count === 0} title={count === 0 ? t("lists.emptyHint") : undefined}>
            {t("lists.save")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
