"use client";

import { useEffect, useRef, useState } from "react";
import { CLOUD_FILE, CollectionsError, parseCloudStorage, steamId3, type ImportResult } from "@/lib/collections";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  steamId: string;
  open: boolean;
  hasImported: boolean;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
  onClear: () => void;
};

type OS = "windows" | "mac" | "linux";

function detectOS(): OS {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return "mac";
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return "linux";
  return "windows";
}

function folderFor(os: OS, id3: string) {
  const tail = `userdata/${id3}/config/cloudstorage`;
  if (os === "mac") return `~/Library/Application Support/Steam/${tail}`;
  if (os === "linux") return `~/.steam/steam/${tail}`;
  return `C:\\Program Files (x86)\\Steam\\${tail.replaceAll("/", "\\")}`;
}

export default function CollectionsImport({ steamId, open, hasImported, onClose, onImported, onClear }: Props) {
  const { t, rich } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [os, setOs] = useState<OS>("windows");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOs(detectOS()), []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setError("");
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  const folder = folderFor(os, steamId3(steamId));

  async function copy() {
    try {
      await navigator.clipboard.writeText(folder);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      onImported(parseCloudStorage(await file.text()));
      onClose();
    } catch (err) {
      setError(
        err instanceof CollectionsError
          ? t(`import.errors.${err.code}`, { file: CLOUD_FILE })
          : t("import.errors.unreadable"),
      );
    }
  }

  return (
    <dialog ref={dialog} className="dialog" onClose={onClose} aria-labelledby="import-title">
      <h2 id="import-title">{t("import.title")}</h2>
      <p>{t("import.intro")}</p>

      <ol>
        <li>
          {t("import.openFolder")}
          <span className="os-tabs" role="group" aria-label={t("import.system")}>
            {(["windows", "mac", "linux"] as const).map((o) => (
              <button key={o} type="button" className={o === os ? "on" : ""} onClick={() => setOs(o)}>
                {o === "windows" ? "Windows" : o === "mac" ? "macOS" : "Linux"}
              </button>
            ))}
          </span>
          <div className="path">
            <code>{folder}</code>
            <button type="button" onClick={copy}>
              {copied ? t("import.copied") : t("import.copy")}
            </button>
          </div>
          {os === "windows" && <small>{t("import.windowsHint")}</small>}
        </li>
        <li>
          {rich("import.chooseStep", { file: CLOUD_FILE })}
          <label className="btn-blue file-btn">
            {t("import.chooseFile")}
            <input type="file" accept=".json,application/json" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </li>
      </ol>

      {error && <p className="dialog-error">{error}</p>}
      <small>{t("import.dynamicNote")}</small>

      <div className="dialog-actions">
        {hasImported && (
          <button type="button" className="btn-ghost" onClick={() => (onClear(), onClose())}>
            {t("import.remove")}
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={onClose}>
          {t("import.close")}
        </button>
      </div>
    </dialog>
  );
}
