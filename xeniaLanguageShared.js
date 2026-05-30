const LANGUAGE_CODES = { en: 1, ja: 2, de: 3, fr: 4, es: 5, it: 6, ko: 7, "zh-TW": 8, zh: 8, pt: 9, pl: 11, ru: 12, sv: 13, tr: 14, nb: 15, nl: 16, "zh-CN": 17 };
const SHORT_LANG_TO_CODE = { en: "en", fr: "fr", de: "de", es: "es", it: "it", ja: "ja", jp: "ja", ko: "ko", pt: "pt", pl: "pl", ru: "ru", sv: "sv", tr: "tr", nb: "nb", nl: "nl", zh: "zh-CN", cn: "zh-CN", tw: "zh-TW" };
const mapLanguageToXeniaCode = (languageOverride) => {
  if (!languageOverride || languageOverride === "auto") return null;
  const code = LANGUAGE_CODES[languageOverride];
  return code != null ? code : null;
};
const normalizeLanguageCode = (raw) => {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  return SHORT_LANG_TO_CODE[key] || (LANGUAGE_CODES[key] != null ? key : null);
};
module.exports = { LANGUAGE_CODES, mapLanguageToXeniaCode, normalizeLanguageCode };
