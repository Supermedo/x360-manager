import {
  languageLabelForCode,
  normalizeLanguageCodes,
  isReliableLanguageSource
} from '../constants/xeniaLanguages';

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

export const inferLanguagesFromTitle = (title) => {
  if (!title) return [];
  const codes = new Set();
  for (const hint of TITLE_HINTS) {
    if (hint.pattern.test(title)) hint.langs.forEach((l) => codes.add(l));
  }
  const region = String(title).toLowerCase();
  for (const [key, langs] of Object.entries(REGION_LANG_MAP)) {
    if (region.includes(key)) langs.forEach((l) => codes.add(l));
  }
  if (/\[RF\]/i.test(title) || /region.?free/i.test(title)) {
    ['en', 'fr', 'de', 'es', 'it'].forEach((l) => codes.add(l));
  }
  return uniq([...codes]);
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

export const mergeLanguageSources = (...lists) =>
  normalizeLanguageCodes(lists.flat());

export const formatSupportedLanguageList = (codes) => {
  const normalized = normalizeLanguageCodes(codes);
  if (!normalized.length) return null;
  return normalized.map((c) => languageLabelForCode(c)).join(', ');
};

export { isReliableLanguageSource, normalizeLanguageCodes };

/**
 * Resolve supported language codes for a game (cached on game.supportedLanguages).
 */
export const resolveGameSupportedLanguages = async ({
  game,
  xbox360DB = [],
  electronAPI = window.electronAPI
}) => {
  const fromTitle = inferLanguagesFromTitle(game?.name);
  const dbEntry = findDbEntry(xbox360DB, game?.titleId, game?.name);
  const fromDb = languagesFromDbEntry(dbEntry);

  let fromProbe = [];
  let source = 'heuristic';
  let confidence = 'low';

  if (fromDb.length) source = 'x360db-title';
  if (fromTitle.length) source = 'title';

  if (electronAPI?.getGameSupportedLanguages) {
    try {
      const res = await electronAPI.getGameSupportedLanguages({
        gameName: game?.name,
        titleId: game?.titleId,
        gamePath: game?.path
      });
      if (res?.ok) {
        fromProbe = res.languages || [];
        if (res.source) source = res.source;
        if (res.confidence) confidence = res.confidence;
      }
    } catch (err) {
      console.warn('[gameLanguages]', err);
    }
  }

  const codes = mergeLanguageSources(fromProbe, fromDb, fromTitle);

  if (confidence === 'low' && isReliableLanguageSource(source)) {
    confidence = 'high';
  } else if (confidence === 'low' && (source === 'path' || source === 'title')) {
    confidence = 'medium';
  }

  return {
    codes,
    source,
    confidence,
    dbTitle: dbEntry?.title || null
  };
};
