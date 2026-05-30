const path = require('path');
const { normalizeLanguageCode, normalizeLanguageCodes } = require('./xeniaLanguageShared');

const REGION_LANG_MAP = {
  usa: ['en'], us: ['en'], world: ['en'], wor: ['en'],
  canada: ['en', 'fr'],
  europe: ['en', 'fr', 'de', 'es', 'it', 'pl', 'ru', 'nl', 'sv', 'nb', 'tr'],
  eu: ['en', 'fr', 'de', 'es', 'it', 'pl', 'ru', 'nl', 'sv', 'nb', 'tr'],
  pal: ['en', 'fr', 'de', 'es', 'it', 'pl', 'ru', 'nl', 'sv', 'nb', 'tr'],
  japan: ['ja'], japon: ['ja'], jp: ['ja'], jpn: ['ja'],
  korea: ['ko'], coree: ['ko'], kr: ['ko'],
  germany: ['de'], allemagne: ['de'],
  france: ['fr'], spain: ['es'], espagne: ['es'],
  italy: ['it'], italie: ['it'],
  brazil: ['pt'], brasil: ['pt'],
  china: ['zh-CN'], chine: ['zh-CN'],
  taiwan: ['zh-TW'], russia: ['ru'], russie: ['ru']
};

const TITLE_HINTS = [
  { pattern: /\((JP|JPN|Japan|Japanese)\)/i, langs: ['ja'] },
  { pattern: /\[(JP|JPN|Japan|Japanese)\]/i, langs: ['ja'] },
  { pattern: /\((US|USA|NTSC-U)\)/i, langs: ['en'] },
  { pattern: /\[(US|USA|NTSC-U)\]/i, langs: ['en'] },
  { pattern: /\((EU|Europe|PAL|EUR)\)/i, langs: ['en', 'fr', 'de', 'es', 'it'] },
  { pattern: /\[(EU|Europe|PAL|EUR)\]/i, langs: ['en', 'fr', 'de', 'es', 'it'] },
  { pattern: /\((GER|Germany|Deutsch)\)/i, langs: ['de'] },
  { pattern: /\((FR|France|French)\)/i, langs: ['fr'] },
  { pattern: /\((ES|Spain|Spanish)\)/i, langs: ['es'] },
  { pattern: /\((IT|Italy|Italian)\)/i, langs: ['it'] },
  { pattern: /\((KR|Korea|Korean)\)/i, langs: ['ko'] },
  { pattern: /\((CN|China|Simplified)\)/i, langs: ['zh-CN'] },
  { pattern: /\((TW|Taiwan|Traditional)\)/i, langs: ['zh-TW'] },
  { pattern: /NTSC-J/i, langs: ['ja'] },
  { pattern: /NTSC-U/i, langs: ['en'] }
];

const uniq = (arr) => [...new Set(arr.filter(Boolean))];

const inferLanguagesFromTitle = (title) => {
  if (!title) return [];
  const codes = new Set();
  for (const hint of TITLE_HINTS) {
    if (hint.pattern.test(title)) hint.langs.forEach((l) => codes.add(l));
  }
  addRegionLangs(codes, title);
  if (/\[RF\]/i.test(title) || /region.?free/i.test(title)) {
    ['en', 'fr', 'de', 'es', 'it'].forEach((l) => codes.add(l));
  }
  return uniq([...codes]);
};

const addRegionLangs = (codes, regionText) => {
  const region = String(regionText || '').toLowerCase();
  for (const [key, langs] of Object.entries(REGION_LANG_MAP)) {
    if (region.includes(key)) langs.forEach((l) => codes.add(l));
  }
};

const inferLanguagesFromPath = (gamePath) => {
  if (!gamePath) return [];
  const normalized = String(gamePath).replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  const texts = uniq([normalized, ...segments, path.basename(gamePath)]);
  const codes = new Set();

  for (const text of texts) {
    inferLanguagesFromTitle(text).forEach((l) => codes.add(l));
    addRegionLangs(codes, text);
    if (/\[PAL\]/i.test(text) || /\(PAL\)/i.test(text)) {
      REGION_LANG_MAP.pal.forEach((l) => codes.add(l));
    }
    if (/\[RF\]/i.test(text) || /region.?free/i.test(text)) {
      ['en', 'fr', 'de', 'es', 'it'].forEach((l) => codes.add(l));
    }
  }

  return uniq([...codes]);
};

const languagesFromScreenScraperJeu = (jeu) => {
  if (!jeu) return { codes: [], synopsisCount: 0 };
  const codes = new Set();
  const synopsis = jeu.synopsis || [];

  for (const row of synopsis) {
    const normalized = normalizeLanguageCode(row?.langue || row?.language);
    if (normalized) codes.add(normalized);
  }

  for (const row of jeu.noms || []) addRegionLangs(codes, row?.region || row?.reg);
  for (const row of jeu.dates || []) addRegionLangs(codes, row?.region || row?.texte || row?.nom);
  for (const row of jeu.regions || []) addRegionLangs(codes, row?.region || row?.texte || row);

  return { codes: normalizeLanguageCodes([...codes]), synopsisCount: synopsis.length };
};

const resolveLanguageSourceMeta = ({ fromScraper, synopsisCount, fromPath, fromTitle, fromDb }) => {
  if (fromScraper.length && synopsisCount >= 2) {
    return { source: 'screenscraper-synopsis', confidence: 'high' };
  }
  if (fromScraper.length) {
    return { source: 'screenscraper', confidence: 'high' };
  }
  if (fromPath.length) {
    return { source: 'path', confidence: 'medium' };
  }
  if (fromTitle.length) {
    return { source: 'title', confidence: 'medium' };
  }
  if (fromDb.length) {
    return { source: 'x360db-title', confidence: 'low' };
  }
  return { source: 'unknown', confidence: 'low' };
};

module.exports = {
  inferLanguagesFromTitle,
  inferLanguagesFromPath,
  languagesFromScreenScraperJeu,
  normalizeLanguageCodes,
  resolveLanguageSourceMeta
};
