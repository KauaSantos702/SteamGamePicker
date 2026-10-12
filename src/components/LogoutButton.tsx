"use client";

import { clearHistory } from "@/lib/history";
import { useI18n } from "@/i18n/I18nProvider";

export default function LogoutButton() {
  const { t } = useI18n();
  return (
    <form action="/api/auth/logout" method="post" onSubmit={() => clearHistory()}>
      <button type="submit" className="link-btn">
        {t("nav.logout")}
      </button>
    </form>
  );
}
