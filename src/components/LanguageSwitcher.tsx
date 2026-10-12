"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

/** Simplified flags drawn as SVG: Windows doesn't render flag emojis. */
function Flag({ locale }: { locale: string }) {
  return (
    <svg className="flag" viewBox="0 0 20 14" width={20} height={14} aria-hidden="true">
      {locale === "pt-BR" && (
        <>
          <rect width="20" height="14" fill="#009c3b" />
          <polygon points="10,1.6 18.4,7 10,12.4 1.6,7" fill="#ffdf00" />
          <circle cx="10" cy="7" r="3.4" fill="#002776" />
        </>
      )}
      {locale === "en" && (
        <>
          <rect width="20" height="14" fill="#fff" />
          {[0, 4, 8, 12].map((y) => (
            <rect key={y} y={y} width="20" height="2" fill="#b22234" />
          ))}
          <rect width="9" height="8" fill="#3c3b6e" />
        </>
      )}
      {locale === "es" && (
        <>
          <rect width="20" height="14" fill="#aa151b" />
          <rect y="3.5" width="20" height="7" fill="#f1bf00" />
        </>
      )}
    </svg>
  );
}

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lang" ref={root}>
      <button
        type="button"
        className="lang-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t("nav.language")}: ${LOCALE_NAMES[locale]}`}
        title={t("nav.language")}
        onClick={() => setOpen((o) => !o)}
      >
        <Flag locale={locale} />
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="lang-menu">
          {Object.keys(LOCALES).map((l) => (
            <li key={l}>
              <button
                type="button"
                lang={l}
                aria-current={l === locale ? "true" : undefined}
                onClick={() => {
                  setLocale(l);
                  setOpen(false);
                }}
              >
                <Flag locale={l} />
                {LOCALE_NAMES[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
