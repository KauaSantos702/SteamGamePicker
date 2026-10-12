import type { Metadata } from "next";
import { DEFAULT_LOCALE, translate } from "@/i18n/config";
import { I18nProvider } from "@/i18n/I18nProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: translate(DEFAULT_LOCALE, "app.name"),
  description: translate(DEFAULT_LOCALE, "app.description"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
