const RELEASE_GROUP_TAGS = /\b(XBOX360|XBLA|GOD|JTAG|RGH|RF|PAL|NTSC|NTSC-U|NTSC-J|USA|EUR|JPN|EUROPE|REGION FREE|PROPER|REPACK|COMPLEX|MARVEL|GLoBAL|iMARS|MoNGoLS|RRoD|ALLSTARS|UNLOCKED|DEMO|PROTOTYPE|BETA)\b/gi;
const NOISE_TOKENS = /\b(v\d+(?:\.\d+)*|disc\s*\d+|disk\s*\d+|dvd\s*\d+|cd\s*\d+|d\d+)\b/gi;

const NUMERAL_MAP = {
  i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10',
  xi: '11', xii: '12', xiii: '13', xiv: '14', xv: '15'
};

export const cleanGameName = (name) => {
  if (!name) return '';
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/\[.*?\]/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\{.*?\}/g, ' ')
    .replace(RELEASE_GROUP_TAGS, ' ')
    .replace(NOISE_TOKENS, ' ')
    .replace(/[_.\-+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const tokenize = (name) =>
  cleanGameName(name)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => NUMERAL_MAP[token] || token);

const stripSpaces = (s) => s.replace(/\s+/g, '');

const editDistance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
};

const stringSimilarity = (a, b) => {
  if (!a || !b) return 0;
  const x = stripSpaces(a);
  const y = stripSpaces(b);
  if (x === y) return 1;
  const distance = editDistance(x, y);
  const longest = Math.max(x.length, y.length);
  return longest === 0 ? 0 : 1 - distance / longest;
};

const extractTrailingNumber = (tokens) => {
  const last = tokens[tokens.length - 1];
  if (!last) return null;
  if (/^\d+$/.test(last)) return last;
  return null;
};

export const scoreNameMatch = (query, candidate) => {
  const qTokens = tokenize(query);
  const cTokens = tokenize(candidate);
  if (!qTokens.length || !cTokens.length) return 0;

  const qNorm = qTokens.join(' ');
  const cNorm = cTokens.join(' ');

  if (qNorm === cNorm) return 1;

  // Sequel disambiguation: "Halo 3" vs "Halo" → fail loudly
  const qNum = extractTrailingNumber(qTokens);
  const cNum = extractTrailingNumber(cTokens);
  if (qNum && cNum && qNum !== cNum) return 0.15;
  if (qNum && !cNum && qTokens.slice(0, -1).join(' ') === cNorm) return 0.55;
  if (cNum && !qNum && cTokens.slice(0, -1).join(' ') === qNorm) return 0.55;

  // Word overlap (Jaccard)
  const qSet = new Set(qTokens);
  const cSet = new Set(cTokens);
  const intersection = [...qSet].filter((token) => cSet.has(token)).length;
  const union = new Set([...qSet, ...cSet]).size;
  const jaccard = union === 0 ? 0 : intersection / union;

  // Edit distance on whole strings
  const ratio = stringSimilarity(qNorm, cNorm);

  // Prefix containment with penalty proportional to length difference
  const longer = qNorm.length >= cNorm.length ? qNorm : cNorm;
  const shorter = qNorm.length < cNorm.length ? qNorm : cNorm;
  let prefixScore = 0;
  if (longer.startsWith(shorter) && shorter.length >= 4) {
    const diff = longer.length - shorter.length;
    prefixScore = Math.max(0, 0.85 - diff * 0.04);
  }

  return Math.max(jaccard * 0.6 + ratio * 0.4, prefixScore);
};

const isXboxDownloadHost = (hostname) =>
  hostname === 'download.xbox.com' || hostname.endsWith('.download.xbox.com');

/**
 * download.xbox.com serves an Akamai certificate that does not cover its own
 * hostname, so HTTPS fails there. The URL is only ever handed to the main
 * process, which downloads it and re-serves the bytes over cover-cache://.
 */
export const toXboxCdnHttpUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  let normalized = url.trim();
  if (normalized.startsWith('//download.xbox.com')) {
    normalized = `http:${normalized}`;
  } else if (/^https:\/\/download\.xbox\.com/i.test(normalized)) {
    normalized = normalized.replace(/^https:\/\/download\.xbox\.com/i, 'http://download.xbox.com');
  }
  normalized = normalized.replace(/^http:\/\/download\.xbox\.com:80\//i, 'http://download.xbox.com/');
  return normalized;
};

export const normalizeCoverUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  let normalized = url.trim();
  if (!normalized) return null;
  if (normalized.startsWith('data:') || normalized.startsWith('file:')) return normalized;

  if (normalized.startsWith('//')) {
    if (normalized.startsWith('//download.xbox.com')) {
      return toXboxCdnHttpUrl(`http:${normalized}`);
    }
    normalized = `https:${normalized}`;
  } else if (normalized.startsWith('/')) {
    normalized = `https://www.screenscraper.fr${normalized}`;
  } else if (/^https?:\/\//i.test(normalized)) {
    try {
      const host = new URL(normalized).hostname.toLowerCase();
      if (isXboxDownloadHost(host)) {
        return toXboxCdnHttpUrl(normalized);
      }
      if (normalized.startsWith('http://')) {
        normalized = normalized.replace(/^http:\/\//i, 'https://');
      }
    } catch {
      if (normalized.startsWith('http://')) {
        normalized = normalized.replace(/^http:\/\//i, 'https://');
      }
    }
  }

  return normalized;
};

export const isXboxCdnUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    return isXboxDownloadHost(new URL(url).hostname.toLowerCase());
  } catch {
    return /download\.xbox\.com/i.test(url);
  }
};

/**
 * Local covers are served over the confined cover-cache:// scheme. A legacy
 * file:// URL that already points into the cache is rewritten in place; anything
 * else has to be copied into the cache by the main process first.
 */
export const fileUrlToCoverCacheUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('cover-cache://')) return url;
  if (!url.startsWith('file:')) return null;
  try {
    const withoutScheme = decodeURIComponent(url.replace(/^file:\/+/i, ''));
    const posix = withoutScheme.replace(/\\/g, '/');
    if (!/\/cover-cache\//i.test(posix)) return null;
    const fileName = posix.split('/').pop();
    return fileName ? `cover-cache://local/${encodeURIComponent(fileName)}` : null;
  } catch {
    return null;
  }
};

/** Synchronous best-effort mapping; returns null when the main process is needed. */
export const normalizeLocalCoverUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('cover-cache://')) return url;
  if (url.startsWith('file:')) return fileUrlToCoverCacheUrl(url);
  return url;
};

/** Asks the main process to copy an out-of-cache local image into the cache. */
export const localizeCoverUrl = async (url) => {
  const direct = fileUrlToCoverCacheUrl(url);
  if (direct) return direct;
  if (!url?.startsWith?.('file:')) return null;
  if (!window.electronAPI?.localizeCoverUrl) return null;
  try {
    return await window.electronAPI.localizeCoverUrl(url);
  } catch {
    return null;
  }
};

export const isEphemeralCoverUrl = (url) =>
  typeof url === 'string' && (url.startsWith('cover-cache://') || url.startsWith('file:'));

export const sanitizeStoredCoverUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('cover-cache://') || url.startsWith('file:')) {
    return normalizeLocalCoverUrl(url);
  }
  if (isXboxCdnUrl(url)) return toXboxCdnHttpUrl(url);
  return url;
};

/** Drop cache-only URLs before persisting — cache files live under userData and move between installs. */
export const coverUrlForPersistence = (url) => {
  if (!url || isEphemeralCoverUrl(url)) return undefined;
  return url;
};

/** Map fetch result to game fields — keeps HTTP source when display URL is cached locally. */
/** After clearing disk cache, drop local file URLs so covers re-download from coverHttpUrl. */
export const localCoverResetPatch = (game) => {
  const url = game?.coverUrl;
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith('file:') && !url.startsWith('cover-cache://')) return null;
  if (game.coverHttpUrl) {
    return { coverUrl: game.coverHttpUrl };
  }
  return { coverUrl: undefined };
};

export const coverFieldsFromDetails = (details) => {
  if (!details?.coverUrl) return {};
  const displayUrl = normalizeLocalCoverUrl(details.coverUrl);
  const httpUrl =
    details.coverHttpUrl ||
    (isEphemeralCoverUrl(displayUrl) ? null : normalizeCoverUrl(displayUrl));
  return {
    coverUrl: httpUrl || displayUrl,
    ...(httpUrl ? { coverHttpUrl: httpUrl } : {}),
    coverSource: details.source,
    coverMatchScore: details.matchScore ?? null
  };
};

export const resolveCoverUrlForDisplay = async (url) => {
  const normalized = normalizeCoverUrl(url);
  if (!normalized) return null;
  if (normalized.startsWith('cover-cache://')) return normalized;
  if (normalized.startsWith('file:')) return localizeCoverUrl(normalized);
  if (normalized.startsWith('data:')) return normalized;

  // Remote covers are downloaded by the main process and served from the local
  // cache, so the renderer itself never reaches out cross-origin.
  if (window.electronAPI?.cacheCoverImage && /^https?:/i.test(normalized)) {
    try {
      const cached = await window.electronAPI.cacheCoverImage(toXboxCdnHttpUrl(normalized));
      if (cached?.startsWith('cover-cache://')) return cached;
      if (cached?.startsWith('file:')) return localizeCoverUrl(cached);
    } catch (e) {
      console.warn('Cover cache failed:', e);
    }
    return null;
  }

  return normalized;
};

export const generatePlaceholderCover = (gameName) => {
  const cleaned = cleanGameName(gameName) || 'Game';
  const initials = cleaned
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('') || 'G';

  const hash = cleaned.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue}, 65%, 35%)"/>
          <stop offset="100%" style="stop-color:hsl(${(hue + 40) % 360}, 70%, 22%)"/>
        </linearGradient>
      </defs>
      <rect width="600" height="900" fill="url(#bg)"/>
      <rect x="40" y="40" width="520" height="820" rx="24" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)"/>
      <text x="300" y="420" text-anchor="middle" fill="white" font-family="Segoe UI, Arial, sans-serif" font-size="120" font-weight="700">${initials}</text>
      <text x="300" y="520" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="600">${cleaned.slice(0, 24)}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const STRONG_MATCH = 0.88;
const ACCEPTABLE_MATCH = 0.52;
const MIN_FALLBACK_MATCH = 0.38;

export const findXbox360DBMatches = (db, gameName, titleId = null, limit = 8) => {
  if (!db?.length) return [];
  const upperId = titleId?.toUpperCase();
  const matches = [];

  if (upperId) {
    const idMatch = db.find(
      (g) =>
        (g.id && g.id.toUpperCase() === upperId) ||
        (g.alternative_id?.some((alt) => alt?.toUpperCase() === upperId))
    );
    if (idMatch) {
      matches.push({ score: 1, source: 'xbox360db', title: idMatch.title, coverUrl: normalizeCoverUrl(idMatch.boxart), titleId: idMatch.id });
    }
  }

  const cleaned = cleanGameName(gameName);
  if (cleaned) {
    const normSearch = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');
    const scored = db
      .map((g) => {
        let score = scoreNameMatch(cleaned, g.title);
        const dbNorm = g.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normSearch.length >= 4 && dbNorm.length >= 4) {
          if (dbNorm === normSearch) score = 1;
          else if (dbNorm.includes(normSearch) || normSearch.includes(dbNorm)) {
            score = Math.max(score, 0.72);
          }
        }
        return {
          score,
          title: g.title,
          coverUrl: normalizeCoverUrl(g.boxart),
          titleId: g.id
        };
      })
      .filter((entry) => entry.score >= 0.32 && entry.coverUrl)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => ({ ...entry, source: 'xbox360db' }));

    for (const candidate of scored) {
      if (!matches.find((m) => m.coverUrl === candidate.coverUrl)) matches.push(candidate);
    }
  }

  return matches.slice(0, limit);
};

const pickBoxArt = (medias = []) => {
  const preferences = [
    (m) => m.type === 'box-2D' && m.parent === 'Principale',
    (m) => m.type === 'box-2D' && (m.region === 'us' || m.region === 'wor'),
    (m) => m.type === 'box-2D',
    (m) => m.type === 'box-3D',
    (m) => typeof m.type === 'string' && m.type.includes('box'),
    (m) => Boolean(m.url)
  ];
  for (const pred of preferences) {
    const found = medias.find(pred);
    if (found?.url) return normalizeCoverUrl(found.url);
  }
  return null;
};

export const searchScreenScraper = async (gameName, titleId = null) => {
  if (!window.electronAPI) return [];
  const candidates = [];
  const cleaned = cleanGameName(gameName);

  if (window.electronAPI.scrapeScreenScraper) {
    try {
      const data = await window.electronAPI.scrapeScreenScraper({ gameName, titleId });
      const jeu = data?.reponse?.jeu;
      if (jeu) {
        const coverUrl = pickBoxArt(jeu.medias);
        if (coverUrl) {
          const title = jeu.noms?.[0]?.nom || gameName;
          const nameScore = scoreNameMatch(cleaned, title);
          candidates.push({
            source: 'screenscraper',
            title,
            coverUrl,
            score: titleId ? Math.max(nameScore, 0.92) : nameScore,
            description: jeu.synopsis?.find((s) => s.langue === 'en')?.texte || jeu.synopsis?.[0]?.texte || null,
            genre: jeu.genres?.[0]?.noms?.find((n) => n.langue === 'en')?.text || jeu.genres?.[0]?.nom || null
          });
        }
      }
    } catch (error) {
      console.warn('ScreenScraper exact-match failed:', error);
    }
  }

  if (window.electronAPI.screenScraperSearch && cleaned) {
    try {
      const list = await window.electronAPI.screenScraperSearch({ gameName: cleaned, limit: 8 });
      for (const entry of list || []) {
        if (!entry?.coverUrl) continue;
        candidates.push({
          source: 'screenscraper',
          title: entry.title,
          coverUrl: normalizeCoverUrl(entry.coverUrl),
          score: scoreNameMatch(cleaned, entry.title || ''),
          description: entry.description,
          genre: entry.genre
        });
      }
    } catch (error) {
      console.warn('ScreenScraper search failed:', error);
    }
  }

  return candidates;
};

export const searchSteam = async (gameName) => {
  const cleaned = cleanGameName(gameName);
  if (!cleaned) return [];
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleaned)}&l=english&cc=US`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items || data.results || [];
    return items.slice(0, 8).map((item) => ({
      source: 'steam',
      title: item.name,
      coverUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/library_600x900_2x.jpg`,
      score: scoreNameMatch(cleaned, item.name),
      description: null,
      genre: null
    }));
  } catch {
    return [];
  }
};

export const searchAllSources = async (gameName, titleId = null, xbox360DB = []) => {
  const cleaned = cleanGameName(gameName);
  if (!cleaned) return [];

  const [dbResults, ssResults, steamResults] = await Promise.all([
    Promise.resolve(findXbox360DBMatches(xbox360DB, gameName, titleId, 10)),
    searchScreenScraper(gameName, titleId),
    searchSteam(gameName)
  ]);

  const xboxCdn = (entry) => isXboxCdnUrl(entry.coverUrl);
  const idMatches = dbResults.filter((e) => e.score >= 0.99);
  const dbNonCdn = dbResults.filter((e) => !xboxCdn(e));
  const dbCdn = dbResults.filter((e) => xboxCdn(e) && e.score < 0.99);

  const ordered = [
    ...idMatches,
    ...ssResults,
    ...steamResults,
    ...dbNonCdn,
    ...dbCdn
  ];

  const seen = new Set();
  return ordered
    .filter((entry) => {
      if (!entry.coverUrl) return false;
      const key = sanitizeStoredCoverUrl(entry.coverUrl);
      if (seen.has(key)) return false;
      seen.add(key);
      entry.coverUrl = normalizeCoverUrl(entry.coverUrl);
      return true;
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
};

const isTrustedCoverHost = (url) => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes('download.xbox.com') ||
      host.includes('xbox.com') ||
      host.includes('screenscraper.fr') ||
      host.includes('steamstatic.com') ||
      host.includes('akamai.steamstatic.com')
    );
  } catch {
    return false;
  }
};

const isCoverUrlReachable = async (url, { lenient = false } = {}) => {
  const normalized = normalizeCoverUrl(url);
  if (!normalized) return false;
  if (normalized.startsWith('data:') || normalized.startsWith('file:')) {
    return true;
  }
  if (normalized.startsWith('cover-cache://')) {
    if (!window.electronAPI?.coverCacheExists) return true;
    try {
      return await window.electronAPI.coverCacheExists(normalized);
    } catch {
      return false;
    }
  }
  if (lenient && isTrustedCoverHost(normalized)) return true;
  if (!window.electronAPI?.validateCoverUrl) return true;
  try {
    return await window.electronAPI.validateCoverUrl(normalized, { lenient });
  } catch {
    return lenient;
  }
};

const buildCoverResult = async (candidate, cleaned) => {
  const httpSource = normalizeCoverUrl(candidate.coverUrl);
  const coverUrl = await resolveCoverUrlForDisplay(candidate.coverUrl);
  if (!coverUrl) return null;
  return {
    coverUrl,
    coverHttpUrl: httpSource && !httpSource.startsWith('cover-cache://') ? httpSource : undefined,
    description: candidate.description || `Xbox 360: ${candidate.title || cleaned}`,
    genre: candidate.genre || 'Xbox 360',
    source: candidate.source,
    matchTitle: candidate.title,
    matchScore: candidate.score,
    auto: true
  };
};

export const fetchGameCoverDetails = async (gameName, titleId = null, xbox360DB = [], options = {}) => {
  const { lenient = true, allowPlaceholder = false } = options;
  const cleaned = cleanGameName(gameName);
  if (!cleaned) return null;

  const candidates = await searchAllSources(gameName, titleId, xbox360DB);
  if (!candidates.length) {
    if (!allowPlaceholder) return null;
    return {
      coverUrl: generatePlaceholderCover(cleaned),
      description: `Xbox 360 game: ${cleaned}`,
      genre: 'Xbox 360',
      source: 'placeholder',
      matchScore: 0,
      auto: true
    };
  }

  const tryCandidate = async (candidate, skipValidation = false) => {
    if (!candidate?.coverUrl) return null;
    if (skipValidation || lenient) {
      const built = await buildCoverResult(candidate, cleaned);
      if (built?.coverUrl) return built;
    }
    if (skipValidation || (await isCoverUrlReachable(candidate.coverUrl, { lenient }))) {
      const built = await buildCoverResult(candidate, cleaned);
      if (built?.coverUrl) return built;
    }
    return null;
  };

  for (const candidate of candidates) {
    if (candidate.score >= 1 || (titleId && candidate.source === 'xbox360db' && candidate.score >= 0.99)) {
      const hit = await tryCandidate(candidate, true);
      if (hit) return hit;
    }
  }

  for (const candidate of candidates) {
    if (candidate.score < ACCEPTABLE_MATCH) continue;
    const hit = await tryCandidate(candidate, candidate.score >= STRONG_MATCH);
    if (hit) return hit;
  }

  for (const candidate of candidates) {
    if (candidate.score < MIN_FALLBACK_MATCH) continue;
    const hit = await tryCandidate(candidate, true);
    if (hit) return hit;
  }

  const best = candidates[0];
  if (best?.coverUrl && lenient) {
    return buildCoverResult(best, cleaned);
  }

  if (allowPlaceholder) {
    return {
      coverUrl: generatePlaceholderCover(cleaned),
      description: `Xbox 360 game: ${cleaned}`,
      genre: 'Xbox 360',
      source: 'placeholder',
      matchScore: 0,
      auto: true
    };
  }

  return null;
};

export const MATCH_THRESHOLDS = { STRONG_MATCH, ACCEPTABLE_MATCH, MIN_FALLBACK_MATCH };
