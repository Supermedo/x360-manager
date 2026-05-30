const LANGUAGE_CODES = {
  en: 1, ja: 2, de: 3, fr: 4, es: 5, it: 6, ko: 7,
  'zh-TW': 8, zh: 8, pt: 9, pl: 11, ru: 12, sv: 13, tr: 14, nb: 15, nl: 16, 'zh-CN': 17
};

const XENIA_ID_TO_CODE = {
  1: 'en', 2: 'ja', 3: 'de', 4: 'fr', 5: 'es', 6: 'it', 7: 'ko',
  8: 'zh-TW', 9: 'pt', 11: 'pl', 12: 'ru', 13: 'sv', 14: 'tr', 15: 'nb', 16: 'nl', 17: 'zh-CN'
};

const SHORT_LANG_TO_CODE = {
  en: 'en', fr: 'fr', de: 'de', es: 'es', it: 'it', ja: 'ja', jp: 'ja', ko: 'ko',
  pt: 'pt', pl: 'pl', ru: 'ru', sv: 'sv', tr: 'tr', nb: 'nb', nl: 'nl',
  zh: 'zh-CN', cn: 'zh-CN', tw: 'zh-TW', eng: 'en', fre: 'fr', ger: 'de', spa: 'es', ita: 'it'
};

const FULL_LANG_NAMES = {
  english: 'en', anglais: 'en', ingles: 'en', inglés: 'en',
  french: 'fr', francais: 'fr', français: 'fr', francés: 'fr',
  german: 'de', deutsch: 'de', allemand: 'de', alemán: 'de',
  spanish: 'es', espanol: 'es', español: 'es', espagnol: 'es',
  italian: 'it', italiano: 'it', italien: 'it',
  japanese: 'ja', japonais: 'ja', japonés: 'ja',
  korean: 'ko', coreano: 'ko', coréen: 'ko',
  portuguese: 'pt', portugais: 'pt', portugués: 'pt',
  polish: 'pl', polonais: 'pl', polaco: 'pl',
  russian: 'ru', russe: 'ru', ruso: 'ru',
  swedish: 'sv', suédois: 'sv', sueco: 'sv',
  turkish: 'tr', turc: 'tr', turco: 'tr',
  norwegian: 'nb', norvégien: 'nb', noruego: 'nb',
  dutch: 'nl', néerlandais: 'nl', holandés: 'nl',
  chinese: 'zh-CN', chinois: 'zh-CN', chino: 'zh-CN',
  'chinese (simplified)': 'zh-CN', 'chinese (traditional)': 'zh-TW',
  'chinois simplifié': 'zh-CN', 'chinois traditionnel': 'zh-TW'
};

const mapLanguageToXeniaCode = (languageOverride) => {
  if (!languageOverride || languageOverride === 'auto') return null;
  const code = LANGUAGE_CODES[languageOverride];
  return code != null ? code : null;
};

const normalizeLanguageCode = (raw) => {
  if (raw == null || raw === '') return null;
  const trimmed = String(raw).trim();
  const key = trimmed.toLowerCase();

  if (/^\d+$/.test(key)) {
    return XENIA_ID_TO_CODE[Number(key)] || null;
  }

  if (SHORT_LANG_TO_CODE[key]) return SHORT_LANG_TO_CODE[key];
  if (FULL_LANG_NAMES[key]) return FULL_LANG_NAMES[key];
  if (LANGUAGE_CODES[trimmed] != null) return trimmed;

  const paren = key.match(/\(([a-z]{2}(?:-[a-z]{2})?)\)/i);
  if (paren && SHORT_LANG_TO_CODE[paren[1].toLowerCase()]) {
    return SHORT_LANG_TO_CODE[paren[1].toLowerCase()];
  }

  for (const [name, code] of Object.entries(FULL_LANG_NAMES)) {
    if (key.includes(name)) return code;
  }

  return null;
};

const normalizeLanguageCodes = (codes) => {
  if (!Array.isArray(codes)) return [];
  const out = new Set();
  for (const raw of codes) {
    const code = normalizeLanguageCode(raw);
    if (code) out.add(code);
  }
  return [...out];
};

module.exports = {
  LANGUAGE_CODES,
  XENIA_ID_TO_CODE,
  mapLanguageToXeniaCode,
  normalizeLanguageCode,
  normalizeLanguageCodes
};
