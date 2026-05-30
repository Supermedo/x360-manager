/** UI-facing language list (mirrors xeniaLanguages.js for the renderer). */
export const XENIA_LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto (game default)' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'pl', label: 'Polish' },
  { value: 'ru', label: 'Russian' },
  { value: 'sv', label: 'Swedish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'nb', label: 'Norwegian' },
  { value: 'nl', label: 'Dutch' }
];

export const mapLanguageToXeniaId = (languageOverride) => {
  if (!languageOverride || languageOverride === 'auto') return null;
  const map = {
    en: 1,
    ja: 2,
    de: 3,
    fr: 4,
    es: 5,
    it: 6,
    ko: 7,
    'zh-TW': 8,
    zh: 8,
    pt: 9,
    pl: 11,
    ru: 12,
    sv: 13,
    tr: 14,
    nb: 15,
    nl: 16,
    'zh-CN': 17
  };
  return map[languageOverride] ?? null;
};

export const languageLabelForCode = (code) => {
  const opt = XENIA_LANGUAGE_OPTIONS.find((o) => o.value === code);
  return opt ? opt.label : code;
};
