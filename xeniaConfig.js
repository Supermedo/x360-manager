const fs = require('fs');
const path = require('path');

const CONFIG_FILENAMES = [
  'xenia-canary.config.toml',
  'xenia_canary.config.toml',
  'xenia-canary-config.toml',
  'xenia_canary_config.toml',
  'xenia.config.toml'
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const KEY_SECTIONS = {
  fullscreen: 'Display',
  vsync: 'Display',
  draw_resolution_scale_x: 'GPU',
  draw_resolution_scale_y: 'GPU',
  internal_display_resolution: 'Video',
  show_profiler: 'UI',
  headless: 'UI',
  mount_cache: 'General',
  user_language: 'XConfig',
  license_mask: 'XConfig',
  keyboard_mode: 'HID',
  keyboard_user_index: 'HID',
  hid: 'HID'
};

const {
  LANGUAGE_CODES,
  mapLanguageToXeniaCode
} = require('./xeniaLanguageShared');

const resolveKeyboardMode = (settings = {}) => {
  if (settings.keyboardMode != null && settings.keyboardMode !== '') {
    const mode = Number(settings.keyboardMode);
    return Number.isFinite(mode) ? mode : 0;
  }
  if (settings.keyboardSupport === true) return 1;
  return 0;
};

const normalizeLaunchSettings = (settings = {}) => {
  const normalized = { ...settings };
  const langCode =
    settings.userLanguage != null && settings.userLanguage !== ''
      ? Number(settings.userLanguage)
      : mapLanguageToXeniaCode(settings.languageOverride);
  if (langCode != null && Number.isFinite(langCode)) {
    normalized.userLanguage = langCode;
  }
  normalized.keyboardMode = resolveKeyboardMode(settings);
  return normalized;
};

/** Xenia expects quoted strings for hid/gpu/etc. — bare winkey breaks its TOML parser. */
const formatTomlValue = (value) => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const str = value == null ? '' : String(value);
  const escaped = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
};

/**
 * Fix TOML broken by older X360 Manager patches (e.g. [Display]fullscreen — parser sees 'f' after ']').
 */
const sanitizeXeniaToml = (content) => {
  if (!content) return content;
  let out = String(content).replace(/^\uFEFF/, '');
  // [Section]key = …  →  [Section]\nkey = …
  out = out.replace(/^(\[[A-Za-z0-9_.]+\])([A-Za-z_])/gm, '$1\n$2');
  // Older builds wrote unquoted hid values
  out = out.replace(/^(\s*hid\s*=\s*)(winkey|any|sdl|xinput|nop)\s*$/gim, '$1"$2"');
  return out;
};

const readConfigContent = (configPath) => {
  if (!fs.existsSync(configPath)) return '';
  return sanitizeXeniaToml(fs.readFileSync(configPath, 'utf8'));
};

const appendTomlSection = (content, section, line) => {
  const trimmed = sanitizeXeniaToml(content || '').trimEnd();
  if (!trimmed) return `[${section}]\n${line}\n`;
  return `${trimmed}\n\n[${section}]\n${line}\n`;
};

const upsertTomlKeyInSection = (content, section, key, value) => {
  const line = `${key} = ${formatTomlValue(value)}`;
  const keyRegex = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=.*$`, 'm');
  const sectionRegex = new RegExp(
    `(\\[${escapeRegExp(section)}\\])([\\t ]*(?:\\r?\\n)[^\\[]*)`,
    'i'
  );
  const match = content.match(sectionRegex);

  if (match) {
    let block = match[2] || '';
    block = keyRegex.test(block) ? block.replace(keyRegex, line) : `${block.trimEnd()}\n${line}\n`;
    const body = block.startsWith('\n') || block.startsWith('\r\n') ? block : `\n${block}`;
    return content.replace(sectionRegex, `${match[1]}${body}`);
  }

  return appendTomlSection(content, section, line);
};

const upsertTomlKey = (content, key, value) => {
  const line = `${key} = ${formatTomlValue(value)}`;
  const keyRegex = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=.*$`, 'm');
  const section = KEY_SECTIONS[key];

  if (section) {
    return upsertTomlKeyInSection(content, section, key, value);
  }

  if (keyRegex.test(content)) {
    return content.replace(keyRegex, line);
  }

  const preferred = 'Display';
  const sectionOrder = ['Display', 'GPU', 'Video', 'UI', 'General', 'XConfig', 'HID', 'Logging'];
  for (const name of sectionOrder) {
    const sectionRegex = new RegExp(
      `(\\[${escapeRegExp(name)}\\])([\\t ]*(?:\\r?\\n)[^\\[]*)`,
      'i'
    );
    const match = content.match(sectionRegex);
    if (match) {
      const block = `${match[1]}${match[2].trimEnd()}\n${line}\n`;
      return content.replace(sectionRegex, block);
    }
  }

  return appendTomlSection(content, preferred, line);
};

const backupConfigFile = (configPath) => {
  if (!fs.existsSync(configPath)) return;
  try {
    fs.copyFileSync(configPath, `${configPath}.x360bak`);
  } catch (err) {
    console.warn(`[xenia-config] Could not backup ${configPath}:`, err.message);
  }
};

const isTruthy = (value) => value === true || value === 'true' || value === 1 || value === '1';

const resolveXeniaConfigPaths = (emulatorPath, documentsPath) => {
  return [resolvePrimaryXeniaConfigPath(emulatorPath, documentsPath)];
};

/** Only paths that exist — never invent extra xenia-*.config.toml stubs Xenia may try to parse. */
const resolveAllXeniaConfigPaths = (emulatorPath, documentsPath) => {
  const emuDir = path.dirname(emulatorPath);
  const paths = [];

  for (const name of CONFIG_FILENAMES) {
    const configPath = path.join(emuDir, name);
    if (fs.existsSync(configPath)) {
      paths.push(configPath);
    }
  }

  const documentsConfig = path.join(documentsPath, 'Xenia', 'xenia.config.toml');
  if (fs.existsSync(documentsConfig) && !paths.includes(documentsConfig)) {
    paths.push(documentsConfig);
  }

  return paths;
};

const resolvePrimaryXeniaConfigPath = (emulatorPath, documentsPath) => {
  const existing = resolveAllXeniaConfigPaths(emulatorPath, documentsPath);
  if (existing.length > 0) {
    const emuDir = path.dirname(emulatorPath);
    return existing.find((p) => path.dirname(p) === emuDir) || existing[0];
  }
  const isCanary = /canary/i.test(path.basename(emulatorPath));
  const name = isCanary ? 'xenia-canary.config.toml' : 'xenia.config.toml';
  return path.join(path.dirname(emulatorPath), name);
};

const resolveWritableXeniaConfigPaths = (emulatorPath, documentsPath) => {
  const existing = resolveAllXeniaConfigPaths(emulatorPath, documentsPath);
  return existing.length > 0 ? existing : [resolvePrimaryXeniaConfigPath(emulatorPath, documentsPath)];
};

/** FPS overlay is set via CLI on launch — patching global config broke RetroBat installs. */
const applyProfilerOverlaySettings = () => {};

const wantsFpsOverlay = (config) => {
  if (!config) return false;
  return (
    config.showFPS === true ||
    config.showFPS === 'true' ||
    config.showStats === true ||
    config.showStats === 'true'
  );
};

const mapLogLevel = (logLevel) => {
  const map = { error: 0, warning: 1, info: 2, debug: 3, verbose: 3 };
  return map[logLevel] ?? 2;
};

const RESOLUTION_SETTINGS = {
  '1280x720': { drawScale: 1, internalDisplayResolution: 8 },
  '1920x1080': { drawScale: 1, internalDisplayResolution: 16 },
  '2560x1440': { drawScale: 2, internalDisplayResolution: 8 },
  '3840x2160': { drawScale: 3, internalDisplayResolution: 16 }
};

const parseLegacyResolutionScale = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(String(value).replace(/x$/i, ''), 10);
  return Number.isFinite(n) && n >= 1 && n <= 7 ? n : null;
};

const resolveResolutionSettings = (resolution, resolutionScale) => {
  if (resolution && resolution !== 'auto' && RESOLUTION_SETTINGS[resolution]) {
    return { ...RESOLUTION_SETTINGS[resolution], resolution };
  }
  const legacyScale = parseLegacyResolutionScale(resolutionScale);
  if (legacyScale) {
    return { drawScale: legacyScale, internalDisplayResolution: null, resolution: null };
  }
  return null;
};

const getResolutionLaunchArgs = (resolution, resolutionScale) => {
  const resolved = resolveResolutionSettings(resolution, resolutionScale);
  const args = [];
  if (!resolved) return args;

  if (resolved.drawScale > 1) {
    args.push(`--draw_resolution_scale_x=${resolved.drawScale}`);
    args.push(`--draw_resolution_scale_y=${resolved.drawScale}`);
  }
  if (resolved.internalDisplayResolution) {
    args.push(`--internal_display_resolution=${resolved.internalDisplayResolution}`);
  }
  return args;
};

const applyXeniaUiSettings = (emulatorPath, documentsPath, config) => {
  const enabled = wantsFpsOverlay(config);
  return {
    enabled,
    configPaths: resolveAllXeniaConfigPaths(emulatorPath, documentsPath),
    skippedFileWrite: true
  };
};

module.exports = {
  applyXeniaUiSettings,
  wantsFpsOverlay,
  mapLogLevel,
  upsertTomlKey,
  formatTomlValue,
  sanitizeXeniaToml,
  resolveXeniaConfigPaths,
  resolveAllXeniaConfigPaths,
  resolvePrimaryXeniaConfigPath,
  resolveWritableXeniaConfigPaths,
  resolveResolutionSettings,
  getResolutionLaunchArgs
};

const normalizeTitleId = (titleId) => {
  if (!titleId) return null;
  const hex = String(titleId).replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (!hex) return null;
  return hex.padStart(8, '0').slice(-8);
};

const buildProfileToml = (settings = {}) => {
  const cfg = normalizeLaunchSettings(settings);
  const lines = [
    `[Display]`,
    `fullscreen = ${cfg.fullscreen ? 'true' : 'false'}`,
    `vsync = ${cfg.vsync !== false ? 'true' : 'false'}`
  ];

  if (cfg.userLanguage != null) {
    lines.push('', '[XConfig]', `user_language = ${cfg.userLanguage}`, 'license_mask = -1');
  }

  const keyboardMode = resolveKeyboardMode(cfg);
  if (keyboardMode > 0) {
    lines.push('', '[HID]', `keyboard_mode = ${keyboardMode}`, 'hid = "winkey"', 'keyboard_user_index = 0');
  }

  if (cfg.showFPS || cfg.showStats) {
    lines.push('', '[UI]', `show_profiler = true`, 'headless = false');
  }

  if (cfg.textureCache) {
    lines.push('', '[General]', 'mount_cache = true');
  }

  const resolution = resolveResolutionSettings(cfg.resolution, cfg.resolutionScale);
  if (resolution) {
    lines.push(
      '',
      '[GPU]',
      `draw_resolution_scale_x = ${resolution.drawScale}`,
      `draw_resolution_scale_y = ${resolution.drawScale}`
    );
    if (resolution.internalDisplayResolution) {
      lines.push('', '[Video]', `internal_display_resolution = ${resolution.internalDisplayResolution}`);
    }
  }

  return `${lines.join('\n')}\n`;
};

const applyProfileToConfigFile = (configPath, settings, options = {}) => {
  const allowCreate = options.allowCreate === true;
  if (!fs.existsSync(configPath) && !allowCreate) {
    return false;
  }

  const cfg = normalizeLaunchSettings(settings);
  let content = fs.existsSync(configPath) ? readConfigContent(configPath) : '';

  if (cfg.userLanguage != null) {
    content = upsertTomlKey(content, 'user_language', cfg.userLanguage);
    content = upsertTomlKey(content, 'license_mask', -1);
  }

  const keyboardMode = resolveKeyboardMode(cfg);
  content = upsertTomlKey(content, 'keyboard_mode', keyboardMode);
  if (keyboardMode > 0) {
    content = upsertTomlKey(content, 'hid', 'winkey');
    content = upsertTomlKey(content, 'keyboard_user_index', 0);
  } else {
    content = upsertTomlKey(content, 'hid', 'any');
  }

  if (cfg.fullscreen !== undefined) {
    content = upsertTomlKey(content, 'fullscreen', Boolean(cfg.fullscreen));
  }
  if (cfg.vsync !== undefined) {
    content = upsertTomlKey(content, 'vsync', cfg.vsync !== false);
  }
  const profilerOn = cfg.showFPS || cfg.showStats;
  content = upsertTomlKey(content, 'show_profiler', profilerOn);
  if (profilerOn) {
    content = upsertTomlKey(content, 'headless', false);
  }
  if (cfg.textureCache !== undefined) {
    content = upsertTomlKey(content, 'mount_cache', Boolean(cfg.textureCache));
  }

  const resolution = resolveResolutionSettings(cfg.resolution, cfg.resolutionScale);
  if (resolution) {
    content = upsertTomlKey(content, 'draw_resolution_scale_x', resolution.drawScale);
    content = upsertTomlKey(content, 'draw_resolution_scale_y', resolution.drawScale);
    if (resolution.internalDisplayResolution) {
      content = upsertTomlKey(content, 'internal_display_resolution', resolution.internalDisplayResolution);
    }
  }

  content = sanitizeXeniaToml(content);
  backupConfigFile(configPath);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, content, 'utf8');
  return true;
};

const repairXeniaConfigFiles = (emulatorPath, documentsPath) => {
  const paths = resolveAllXeniaConfigPaths(emulatorPath, documentsPath);
  const repaired = [];
  for (const configPath of paths) {
    if (!fs.existsSync(configPath)) continue;
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const fixed = sanitizeXeniaToml(raw);
      if (fixed !== raw) {
        backupConfigFile(configPath);
        fs.writeFileSync(configPath, fixed, 'utf8');
        repaired.push(configPath);
      }
    } catch (err) {
      console.warn(`[xenia-config] Repair failed for ${configPath}:`, err.message);
    }
  }
  return repaired;
};

const applyProfileToXeniaConfig = (emulatorPath, documentsPath, settings) => {
  const paths = resolveWritableXeniaConfigPaths(emulatorPath, documentsPath);
  const patched = [];
  for (const configPath of paths) {
    try {
      const allowCreate = paths.length === 1 && configPath === paths[0];
      if (applyProfileToConfigFile(configPath, settings, { allowCreate })) {
        patched.push(configPath);
      }
    } catch (err) {
      console.warn(`[xenia-profile] Failed to patch ${configPath}:`, err.message);
    }
  }
  return patched;
};

const writePerGameXeniaConfig = (emulatorPath, titleId, settings) => {
  const normalized = normalizeTitleId(titleId);
  if (!normalized) return null;

  const configDir = path.join(path.dirname(emulatorPath), 'config');
  fs.mkdirSync(configDir, { recursive: true });
  const filePath = path.join(configDir, `${normalized}.config.toml`);
  fs.writeFileSync(filePath, buildProfileToml(settings), 'utf8');
  return filePath;
};

const resolveLaunchLanguageCode = (settings = {}) => {
  if (settings.userLanguage != null && settings.userLanguage !== '') {
    const n = Number(settings.userLanguage);
    if (Number.isFinite(n)) return n;
  }
  return mapLanguageToXeniaCode(settings.languageOverride);
};

const patchXConfigLanguageBlock = (content, langCode) => {
  let body = sanitizeXeniaToml(content || '');
  body = body.replace(/^\s*user_language\s*=.*$/gim, '');
  body = body.replace(/^\s*license_mask\s*=.*$/gim, '');
  const xconfigLines = `user_language = ${langCode}\nlicense_mask = -1\n`;
  const sectionRegex = /\[XConfig\][\t ]*(?:\r?\n)[\s\S]*?(?=\n\[|$)/i;
  if (sectionRegex.test(body)) {
    return sanitizeXeniaToml(body.replace(sectionRegex, `[XConfig]\n${xconfigLines}`));
  }
  const trimmed = body.trimEnd();
  if (!trimmed) return `[XConfig]\n${xconfigLines}`;
  return sanitizeXeniaToml(`${trimmed}\n\n[XConfig]\n${xconfigLines}`);
};

/**
 * Xenia reads user_language from the main config at startup — per-game TOML is too late.
 * Patch only [XConfig] user_language + license_mask in the emulator's config file(s).
 */
const applyLaunchLanguageSettings = (emulatorPath, documentsPath, settings = {}) => {
  const langCode = resolveLaunchLanguageCode(settings);
  if (langCode == null) {
    return { applied: false, reason: 'auto' };
  }

  const paths = resolveWritableXeniaConfigPaths(emulatorPath, documentsPath);
  const patched = [];

  for (const configPath of paths) {
    try {
      const raw = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
      const content = patchXConfigLanguageBlock(raw, langCode);
      if (fs.existsSync(configPath)) {
        backupConfigFile(configPath);
      }
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, content, 'utf8');
      patched.push(configPath);
    } catch (err) {
      console.warn(`[xenia-lang] Failed to set language in ${configPath}:`, err.message);
    }
  }

  return { applied: patched.length > 0, langCode, configPaths: patched };
};

const applyXeniaProfile = (emulatorPath, documentsPath, settings, titleId, options = {}) => {
  const patchGlobal = options.patchGlobal === true;
  const repairedPaths = repairXeniaConfigFiles(emulatorPath, documentsPath);
  const languageResult = applyLaunchLanguageSettings(emulatorPath, documentsPath, settings);
  const globalPaths = patchGlobal
    ? applyProfileToXeniaConfig(emulatorPath, documentsPath, settings)
    : [];
  const gamePath = titleId ? writePerGameXeniaConfig(emulatorPath, titleId, settings) : null;
  return { globalPaths, gameConfigPath: gamePath, repairedPaths, languageResult };
};

const applyLaunchDisplaySettings = (emulatorPath, documentsPath, settings, titleId) => {
  if (settings?.isArcade) {
    return { globalPaths: [], gameConfigPath: null, skipped: true };
  }

  const displaySettings = {
    fullscreen: isTruthy(settings?.fullscreen),
    vsync: settings?.vsync !== false,
    resolution: settings?.resolution,
    resolutionScale: settings?.resolutionScale,
    textureCache: settings?.textureCache || settings?.mountCache,
    showFPS: settings?.showFPS,
    showStats: settings?.showStats
  };
  const globalPaths = applyProfileToXeniaConfig(emulatorPath, documentsPath, displaySettings);
  const gamePath = titleId ? writePerGameXeniaConfig(emulatorPath, titleId, displaySettings) : null;
  return { globalPaths, gameConfigPath: gamePath };
};

module.exports.applyProfileToXeniaConfig = applyProfileToXeniaConfig;
module.exports.writePerGameXeniaConfig = writePerGameXeniaConfig;
module.exports.applyXeniaProfile = applyXeniaProfile;
module.exports.repairXeniaConfigFiles = repairXeniaConfigFiles;
module.exports.resolvePrimaryXeniaConfigPath = resolvePrimaryXeniaConfigPath;
module.exports.resolveWritableXeniaConfigPaths = resolveWritableXeniaConfigPaths;
module.exports.sanitizeXeniaToml = sanitizeXeniaToml;
module.exports.applyLaunchDisplaySettings = applyLaunchDisplaySettings;
module.exports.buildProfileToml = buildProfileToml;
module.exports.normalizeTitleId = normalizeTitleId;
module.exports.isTruthy = isTruthy;
module.exports.mapLanguageToXeniaCode = mapLanguageToXeniaCode;
module.exports.resolveLaunchLanguageCode = resolveLaunchLanguageCode;
module.exports.applyLaunchLanguageSettings = applyLaunchLanguageSettings;
module.exports.resolveKeyboardMode = resolveKeyboardMode;
module.exports.LANGUAGE_CODES = LANGUAGE_CODES;