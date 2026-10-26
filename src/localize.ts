import { en, Translations } from "./translations/en";
import { de } from "./translations/de";
import { fr } from "./translations/fr";
import { it } from "./translations/it";
import { pl } from "./translations/pl";
import { sk } from "./translations/sk";

// Same languages as the AstroWeather integration
const LANGUAGES: Record<string, Translations> = { en, de, fr, it, pl, sk };

type Section = keyof Translations;
export type TranslationKey = {
  [S in Section]: `${S}.${Extract<keyof Translations[S], string>}`;
}[Section];

// Language selected in Home Assistant, e.g. "de" or "de-CH"
export function getLanguage(hass?: any): string {
  return hass?.locale?.language || hass?.selectedLanguage || hass?.language || "en";
}

function translationsFor(language: string): Translations {
  const lang = language.toLowerCase();
  return LANGUAGES[lang] || LANGUAGES[lang.split("-")[0]] || en;
}

// Translate a key like "details.seeing", replacing placeholders like {entity}.
// Falls back to English, then to the key itself.
export function localize(
  hass: any,
  key: TranslationKey,
  params: Record<string, string | number> = {}
): string {
  const [section, name] = key.split(".") as [Section, string];
  const text =
    translationsFor(getLanguage(hass))[section]?.[name] ??
    en[section]?.[name] ??
    key;
  return Object.entries(params).reduce(
    (result, [param, value]) => result.replace(`{${param}}`, String(value)),
    text
  );
}
