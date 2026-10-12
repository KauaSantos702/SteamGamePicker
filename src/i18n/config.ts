import en from "./messages/en.json";
import es from "./messages/es.json";
import ptBR from "./messages/pt-BR.json";

// pt-BR is the reference translation: it defines every key. Other languages may be partial;
// any missing key falls back to pt-BR.
export type Messages = typeof ptBR;

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

/** Registered languages. To add one: create messages/<code>.json and list it here. */
export const LOCALES: Record<string, DeepPartial<Messages>> = {
  "pt-BR": ptBR,
  en,
  es,
};

/** Each language's name in itself, shown in the language menu whatever the current locale is. */
export const LOCALE_NAMES: Record<string, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
  es: "Español",
};

export const DEFAULT_LOCALE = "pt-BR";

type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/** Every translatable key, e.g. "library.roll" or "history.summary" (a plural group). */
export type MessageKey = Paths<Messages>;
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string | PluralForms ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type Vars = Record<string, string | number>;

function lookup(messages: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
}

/** Resolves a key for a locale, picks the plural form from `vars.count` and fills `{name}` placeholders. */
export function translate(locale: string, key: MessageKey, vars: Vars = {}): string {
  let value = lookup(LOCALES[locale], key) ?? lookup(LOCALES[DEFAULT_LOCALE], key);

  if (value && typeof value === "object") {
    const forms = value as PluralForms;
    value = forms[new Intl.PluralRules(locale).select(Number(vars.count ?? 0))] ?? forms.other;
  }
  if (typeof value !== "string") return key;

  return value.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/** Best registered locale for the browser's language list (exact match first, then same language). */
export function matchLocale(preferred: readonly string[]): string {
  const available = Object.keys(LOCALES);
  for (const tag of preferred) {
    const exact = available.find((l) => l.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const base = tag.split("-")[0].toLowerCase();
    const sameLanguage = available.find((l) => l.split("-")[0].toLowerCase() === base);
    if (sameLanguage) return sameLanguage;
  }
  return DEFAULT_LOCALE;
}
