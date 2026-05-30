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
  const normalized = normalizeLanguageCode(code);
  const opt = XENIA_LANGUAGE_OPTIONS.find((o) => o.value === normalized);
  return opt ? opt.label : (normalized || code);
};

const XENIA_ID_TO_CODE = {
  1: 'en', 2: 'ja', 3: 'de', 4: 'fr', 5: 'es', 6: 'it', 7: 'ko',
  8: 'zh-TW', 9: 'pt', 11: 'pl', 12: 'ru', 13: 'sv', 14: 'tr', 15: 'nb', 16: 'nl', 17: 'zh-CN'
};

export const normalizeLanguageCode = (raw) => {
  if (raw == null || raw === '') return null;
  const trimmed = String(raw).trim();
  const key = trimmed.toLowerCase();
  if (/^\d+$/.test(key)) return XENIA_ID_TO_CODE[Number(key)] || null;
  if (XENIA_LANGUAGE_OPTIONS.some((o) => o.value === trimmed)) return trimmed;
  if (key === 'jp') return 'ja';
  if (key === 'zh') return 'zh-CN';
  if (key === 'cn') return 'zh-CN';
  if (key === 'tw') return 'zh-TW';
  return null;
};

export const normalizeLanguageCodes = (codes) => {
  if (!Array.isArray(codes)) return [];
  const out = new Set();
  for (const raw of codes) {
    const code = normalizeLanguageCode(raw);
    if (code) out.add(code);
  }
  return [...out];
};

export const isReliableLanguageSource = (source) =>
  source === 'screenscraper' || source === 'screenscraper-synopsis';
