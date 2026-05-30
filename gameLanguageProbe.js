const { normalizeLanguageCode } = require("./xeniaLanguageShared");

const REGION_LANG_MAP = {
  usa: ["en"], us: ["en"], world: ["en"], wor: ["en"],
  canada: ["en", "fr"],
  europe: ["en", "fr", "de", "es", "it", "pl", "ru", "nl", "sv", "nb", "tr"],
  eu: ["en", "fr", "de", "es", "it", "pl", "ru", "nl", "sv", "nb", "tr"],
  pal: ["en", "fr", "de", "es", "it", "pl", "ru", "nl", "sv", "nb", "tr"],
  japan: ["ja"], japon: ["ja"], jp: ["ja"],
  korea: ["ko"], coree: ["ko"],
  germany: ["de"], france: ["fr"], spain: ["es"], italy: ["it"],
  brazil: ["pt"], china: ["zh-CN"], taiwan: ["zh-TW"], russia: ["ru"]
};

const TITLE_HINTS = [
  { pattern: /\((JP|JPN|Japan|Japanese)\)/i, langs: ["ja"] },
  { pattern: /\((US|USA|NTSC-U)\)/i, langs: ["en"] },
  { pattern: /\((EU|Europe|PAL|EUR)\)/i, langs: ["en", "fr", "de", "es", "it"] },
  { pattern: /\((GER|Germany)\)/i, langs: ["de"] },
  { pattern: /\((FR|France)\)/i, langs: ["fr"] },
  { pattern: /\((KR|Korea)\)/i, langs: ["ko"] }
];

const uniq = (arr) => [...new Set(arr.filter(Boolean))];

const inferLanguagesFromTitle = (title) => {
  if (!title) return [];
  for (const hint of TITLE_HINTS) {
    if (hint.pattern.test(title)) return [...hint.langs];
  }
  return [];
};

const addRegionLangs = (codes, regionText) => {
  const region = String(regionText || "").toLowerCase();
  for (const [key, langs] of Object.entries(REGION_LANG_MAP)) {
    if (region.includes(key)) langs.forEach((l) => codes.add(l));
  }
};

const languagesFromScreenScraperJeu = (jeu) => {
  if (!jeu) return [];
  const codes = new Set();
  for (const row of jeu.synopsis || []) {
    const normalized = normalizeLanguageCode(row?.langue || row?.language);
    if (normalized) codes.add(normalized);
  }
  for (const row of jeu.noms || []) addRegionLangs(codes, row?.region || row?.reg);
  for (const row of jeu.dates || []) addRegionLangs(codes, row?.region || row?.texte || row?.nom);
  for (const row of jeu.regions || []) addRegionLangs(codes, row?.region || row?.texte || row);
  return uniq([...codes]);
};

module.exports = { inferLanguagesFromTitle, languagesFromScreenScraperJeu };
