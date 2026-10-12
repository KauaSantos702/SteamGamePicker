import App from "@/components/App";
import { DEFAULT_LOCALE, translate } from "@/i18n/config";

export const metadata = {
  title: `${translate(DEFAULT_LOCALE, "history.title")} · ${translate(DEFAULT_LOCALE, "app.name")}`,
};

export default function SorteadosPage() {
  return <App tab="sorteados" />;
}
