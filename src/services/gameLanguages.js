import { languageLabelForCode } from '../constants/xeniaLanguages';

const REGION_LANG_MAP = {
  usa: ['en'],
  us: ['en'],
  world: ['en'],
  wor: ['en'],
  canada: ['en', 'fr'],
  europe: ['en', 'fr', 'de', 'es', 'it', 'pl', 'ru', 'nl', 'sv', 'nb', 'tr'],
  eu: ['en', 'fr', 'de', 'es', 'it', 'pl', 'ru', 'nl', 'sv', 'nb', 'tr'],
  pal: ['en', 'fr', 'de', 'es', 'it', 'pl', 'ru', 'nl', 'sv', 'nb', 'tr'],
  japan: ['ja'],
  japon: ['ja'],
  jp: ['ja'],
  jpn: ['ja'],
  korea: ['ko'],
  coree: ['ko'],
  kr: ['ko'],
  germany: ['de'],
  allemagne: ['de'],
  france: ['fr'],
  spain: ['es'],
  espagne: ['es'],
  italy: ['it'],
  italie: ['it'],
  brazil: ['pt'],
  brasil: ['pt'],
  china: ['zh-CN'],
  chine: ['zh-CN'],
  taiwan: ['zh-TW'],
  russia: ['ru'],
  russie: ['ru']
};

const TITLE_HINTS = [
  { pattern: /\((JP|JPN|Japan|Japanese)\)/i, langs: ['ja'] },
  { pattern: /\((US|USA|NTSC-U)\)/i, langs: ['en'] },
  { pattern: /\((EU|Europe|PAL|EUR)\)/i, langs: ['en', 'fr', 'de', 'es', 'it'] },
  { pattern: /\((GER|Germany|Deutsch)\)/i, langs: ['de'] },
  { pattern: /\((FR|France|French)\)/i, langs: ['fr'] },
  { pattern: /\((ES|Spain|Spanish)\)/i, langs: ['es'] },
  { pattern: /\((IT|Italy|Italian)\)/i, langs: ['it'] },
  { pattern: /\((KR|Korea|Korean)\)/i, langs: ['ko'] },
  { pattern: /\((CN|China|Simplified)\)/i, langs: ['zh-CN'] },
  { pattern: /\((TW|Taiwan|Traditional)\)/i, langs: ['zh-TW'] }
];

const uniq = (arr) => [...new Set(arr.filter(Boolean))];

export const inferLanguagesFromTitle = (title) => {
  if (!title) return [];
  for (const hint of TITLE_HINTS) {
    if (hint.pattern.test(title)) return [...hint.langs];
  }
  return [];
};

export const findDbEntry = (xbox360DB, titleId, gameName) => {
  if (!Array.isArray(xbox360DB) || xbox360DB.length === 0) return null;
  const tid = titleId ? String(titleId).replace(/[^0-9A-Fa-f]/g, '').toUpperCase() : null;
  if (tid) {
    const byId = xbox360DB.find((g) => String(g.id || '').toUpperCase() === tid);
    if (byId) return byId;
  }
  if (!gameName) return null;
  const cleaned = gameName.replace(/\.[^/.]+$/, '').trim().toLowerCase();
  return (
    xbox360DB.find((g) => g.title?.toLowerCase() === cleaned)
    || xbox360DB.find((g) => g.title?.toLowerCase().includes(cleaned))
    || null
  );
};

export const languagesFromDbEntry = (entry) => {
  if (!entry?.title) return [];
  return inferLanguagesFromTitle(entry.title);
};

export const languagesFromScreenScraperJeu = (jeu) => {
  if (!jeu) return [];
  const codes = new Set();

  const SHORT = {
    en: 'en', fr: 'fr', de: 'de', es: 'es', it: 'it', ja: 'ja', jp: 'ja', ko: 'ko',
    pt: 'pt', pl: 'pl', ru: 'ru', sv: 'sv', tr: 'tr', nb: 'nb', nl: 'nl',
    zh: 'zh-CN', cn: 'zh-CN', tw: 'zh-TW'
  };
  for (const row of jeu.synopsis || []) {
    const lang = String(row?.langue || row?.language || '').toLowerCase();
    if (SHORT[lang]) codes.add(SHORT[lang]);
  }

  for (const row of jeu.noms || []) {
    const region = String(row?.region || row?.reg || '').toLowerCase();
    for (const [key, langs] of Object.entries(REGION_LANG_MAP)) {
      if (region.includes(key)) langs.forEach((l) => codes.add(l));
    }
  }

  for (const row of jeu.dates || []) {
    const region = String(row?.region || row?.texte || row?.nom || '').toLowerCase();
    for (const [key, langs] of Object.entries(REGION_LANG_MAP)) {
      if (region.includes(key)) langs.forEach((l) => codes.add(l));
    }
  }

  for (const row of jeu.regions || []) {
    const region = String(row?.region || row?.texte || row || '').toLowerCase();
    for (const [key, langs] of Object.entries(REGION_LANG_MAP)) {
      if (region.includes(key)) langs.forEach((l) => codes.add(l));
    }
  }

  return uniq([...codes].map((c) => (c === 'jp' ? 'ja' : c)));
};

export const mergeLanguageSources = (...lists) => {
  const out = new Set();
  for (const list of lists) {
    for (const code of list || []) {
      if (code && code !== 'auto') out.add(code);
    }
  }
  return [...out];
};

export const formatSupportedLanguageList = (codes) => {
  if (!codes?.length) return null;
  return codes.map((c) => languageLabelForCode(c)).join(', ');
};

/**
 * Resolve supported language codes for a game (cached on game.supportedLanguages).
 */
export const resolveGameSupportedLanguages = async ({
  game,
  xbox360DB = [],
  electronAPI = window.electronAPI
}) => {
  if (game?.supportedLanguages?.length) {
    return { codes: game.supportedLanguages, source: game.supportedLanguagesSource || 'cached' };
  }

  const fromTitle = inferLanguagesFromTitle(game?.name);
  const dbEntry = findDbEntry(xbox360DB, game?.titleId, game?.name);
  const fromDb = languagesFromDbEntry(dbEntry);

  let fromScraper = [];
  let source = 'heuristic';
  if (fromDb.length) source = 'x360db-title';
  if (fromTitle.length) source = 'title';

  if (electronAPI?.getGameSupportedLanguages) {
    try {
      const res = await electronAPI.getGameSupportedLanguages({
        gameName: game?.name,
        titleId: game?.titleId,
        gamePath: game?.path
      });
      if (res?.ok && res.languages?.length) {
        fromScraper = res.languages;
        source = res.source || 'screenscraper';
      }
    } catch (err) {
      console.warn('[gameLanguages]', err);
    }
  }

  const codes = mergeLanguageSources(fromScraper, fromDb, fromTitle);
  return { codes, source, dbTitle: dbEntry?.title || null };
};
