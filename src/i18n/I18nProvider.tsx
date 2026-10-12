"use client";

import { createContext, Fragment, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALES, matchLocale, translate, type MessageKey, type Vars } from "./config";

const STORAGE_KEY = "sorteador-idioma";

type Tags = Record<string, (chunk: string) => ReactNode>;

const DEFAULT_TAGS: Tags = {
  b: (chunk) => <strong>{chunk}</strong>,
  code: (chunk) => <code>{chunk}</code>,
};

function useI18nValue(locale: string, setLocale: (l: string) => void) {
  return useMemo(() => {
    const t = (key: MessageKey, vars?: Vars) => translate(locale, key, vars);

    /** Like t(), but turns <b>…</b> and <code>…</code> (or custom tags) into elements. */
    const rich = (key: MessageKey, vars?: Vars, tags: Tags = DEFAULT_TAGS): ReactNode[] => {
      const text = t(key, vars);
      const out: ReactNode[] = [];
      const re = /<(\w+)>(.*?)<\/\1>/g;
      let last = 0;
      for (let m = re.exec(text); m; m = re.exec(text)) {
        out.push(text.slice(last, m.index));
        const render = tags[m[1]];
        out.push(<Fragment key={m.index}>{render ? render(m[2]) : m[2]}</Fragment>);
        last = re.lastIndex;
      }
      out.push(text.slice(last));
      return out;
    };

    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
    const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });
    const collator = new Intl.Collator(locale);

    const format = {
      playtime(minutes: number) {
        if (minutes === 0) return t("format.neverPlayed");
        if (minutes < 60) return t("format.minutes", { value: minutes });
        return t("format.hours", { value: number.format(minutes / 60) });
      },
      lastPlayed(unixSeconds?: number) {
        if (!unixSeconds) return t("format.never");
        const days = Math.round((unixSeconds * 1000 - Date.now()) / 86_400_000);
        if (days > -1) return t("format.today");
        if (days > -30) return relative.format(days, "day");
        if (days > -365) return relative.format(Math.round(days / 30), "month");
        return relative.format(Math.round(days / 365), "year");
      },
      drawnAt(ms: number) {
        const d = new Date(ms);
        const vars = { time: time.format(d), date: date.format(d) };
        return new Date().toDateString() === d.toDateString() ? t("history.today", vars) : t("history.onDate", vars);
      },
      compare: collator.compare,
    };

    return { locale, setLocale, t, rich, format };
  }, [locale, setLocale]);
}

type I18n = ReturnType<typeof useI18nValue>;

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Pages are prerendered in the default locale; the browser's language is applied after hydration.
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage blocked: use the browser language.
    }
    setLocaleState(saved && saved in LOCALES ? saved : matchLocale(navigator.languages ?? [navigator.language]));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useMemo(
    () => (next: string) => {
      if (!(next in LOCALES)) return;
      setLocaleState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Not remembered, but applied for this visit.
      }
    },
    [],
  );

  const value = useI18nValue(locale, setLocale);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n precisa estar dentro de <I18nProvider>.");
  return ctx;
}
