"use client";

import { REPO_URL } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";

const QUESTIONS = [
  "login",
  "read",
  "stored",
  "browser",
  "delete",
  "public",
  "missing",
  "collections",
  "play",
  "official",
  "contribute",
] as const;

const external = (href: string) => (chunk: string) => (
  <a href={href} target="_blank" rel="noreferrer">
    {chunk}
  </a>
);

const TAGS = {
  b: (chunk: string) => <strong>{chunk}</strong>,
  code: (chunk: string) => <code>{chunk}</code>,
  repo: external(REPO_URL),
  issues: external(`${REPO_URL}/issues`),
  privacy: external("https://steamcommunity.com/my/edit/settings"),
};

export default function Faq() {
  const { t, rich } = useI18n();
  // Answers name these buttons; reuse their labels so the text always matches the interface.
  const vars = { removeButton: t("import.remove"), deleteListButton: t("lists.delete"), storeButton: t("library.store") };
  return (
    <main className="faq">
      <h1>{t("faq.title")}</h1>
      <p className="faq-intro">{t("faq.intro")}</p>
      <div className="faq-list">
        {QUESTIONS.map((id, i) => (
          <details key={id} className="faq-item" open={i < 3}>
            <summary>{t(`faq.items.${id}.q`)}</summary>
            <p>{rich(`faq.items.${id}.a`, vars, TAGS)}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
