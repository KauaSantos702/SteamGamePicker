import App from "@/components/App";
import { DEFAULT_LOCALE, translate } from "@/i18n/config";

export const metadata = {
  title: `${translate(DEFAULT_LOCALE, "faq.title")} · ${translate(DEFAULT_LOCALE, "app.name")}`,
};

export default function DuvidasPage() {
  return <App tab="duvidas" />;
}
