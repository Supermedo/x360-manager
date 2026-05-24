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
  mount_cache: 'General'
};

const upsertTomlKey = (content, key, value) => {
  const isBool = typeof value === 'boolean';
  const isNumber = typeof value === 'number';
  const valStr = isBool ? (value ? 'true' : 'false') : isNumber ? String(value) : String(value);
  const line = `${key} = ${valStr}`;
  const keyRegex = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=.*$`, 'm');

  if (keyRegex.test(content)) {
    return content.replace(keyRegex, line);
  }

  const preferred = KEY_SECTIONS[key] || 'Display';
  const sectionOrder = [preferred, 'Display', 'GPU', 'Video', 'UI', 'General', 'Logging'];
  const seen = new Set();
  for (const section of sectionOrder) {
    if (seen.has(section)) continue;
    seen.add(section);
    const sectionRegex = new RegExp(`(\\[${section}\\][^\\[]*)`, 'i');
    const match = content.match(sectionRegex);
    if (match) {
      const block = match[1].trimEnd();
      return content.replace(sectionRegex, `${block}\n${line}\n`);
    }
  }

  const trimmed = (content || '').trimEnd();
  if (!trimmed) {
    return `[${preferred}]\n${line}\n`;
  }
  return `${trimmed}\n\n[${preferred}]\n${line}\n`;
};

const isTruthy = (value) => value === true || value === 'true' || value === 1 || value === '1';

const resolveXeniaConfigPaths = (emulatorPath, documentsPath) => {
  const all = resolveAllXeniaConfigPaths(emulatorPath, documentsPath);
  return all.length > 0 ? [all[0]] : [path.join(path.dirname(emulatorPath), 'xenia-canary.config.toml')];
};

const resolveAllXeniaConfigPaths = (emulatorPath, documentsPath) => {
  const emuDir = path.dirname(emulatorPath);
  const isCanary = /canary/i.test(path.basename(emulatorPath));
  const paths = new Set();

  for (const name of CONFIG_FILENAMES) {
    const configPath = path.join(emuDir, name);
    if (fs.existsSync(configPath)) {
      paths.add(configPath);
    }
  }

  if (isCanary) {
    paths.add(path.join(emuDir, 'xenia-canary.config.toml'));
    paths.add(path.join(emuDir, 'xenia-canary-config.toml'));
    paths.add(path.join(emuDir, 'xenia_canary.config.toml'));
  }

  if (paths.size === 0) {
    const documentsConfig = path.join(documentsPath, 'Xenia', 'xenia.config.toml');
    if (fs.existsSync(documentsConfig)) {
      paths.add(documentsConfig);
    } else if (isCanary) {
      paths.add(path.join(emuDir, 'xenia-canary.config.toml'));
    } else {
      paths.add(path.join(emuDir, 'xenia.config.toml'));
    }
  }

  return [...paths];
};

const applyProfilerOverlaySettings = (configPath, enabled) => {
  let content = '';
  if (fs.existsSync(configPath)) {
    content = fs.readFileSync(configPath, 'utf8');
  }

  content = upsertTomlKey(content, 'show_profiler', enabled);
  if (enabled) {
    content = upsertTomlKey(content, 'headless', false);
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, content, 'utf8');
};

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
  const paths = resolveXeniaConfigPaths(emulatorPath, documentsPath);

  for (const configPath of paths) {
    try {
      applyProfilerOverlaySettings(configPath, enabled);
    } catch (err) {
      console.warn(`[xenia-config] Failed to patch ${configPath}:`, err.message);
    }
  }

  return { enabled, configPaths: paths };
};

module.exports = {
  applyXeniaUiSettings,
  wantsFpsOverlay,
  mapLogLevel,
  upsertTomlKey,
  resolveXeniaConfigPaths,
  resolveAllXeniaConfigPaths,
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
  const lines = [
    `[Display]`,
    `fullscreen = ${settings.fullscreen ? 'true' : 'false'}`,
    `vsync = ${settings.vsync !== false ? 'true' : 'false'}`
  ];

  if (settings.showFPS || settings.showStats) {
    lines.push('', '[UI]', `show_profiler = true`, 'headless = false');
  }

  if (settings.textureCache) {
    lines.push('', 'mount_cache = true');
  }

  const resolution = resolveResolutionSettings(settings.resolution, settings.resolutionScale);
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

const applyProfileToConfigFile = (configPath, settings) => {
  let content = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';

  if (settings.fullscreen !== undefined) {
    content = upsertTomlKey(content, 'fullscreen', Boolean(settings.fullscreen));
  }
  if (settings.vsync !== undefined) {
    content = upsertTomlKey(content, 'vsync', settings.vsync !== false);
  }
  const profilerOn = settings.showFPS || settings.showStats;
  content = upsertTomlKey(content, 'show_profiler', profilerOn);
  if (profilerOn) {
    content = upsertTomlKey(content, 'headless', false);
  }
  if (settings.textureCache) {
    content = upsertTomlKey(content, 'mount_cache', true);
  }

  const resolution = resolveResolutionSettings(settings.resolution, settings.resolutionScale);
  if (resolution) {
    content = upsertTomlKey(content, 'draw_resolution_scale_x', resolution.drawScale);
    content = upsertTomlKey(content, 'draw_resolution_scale_y', resolution.drawScale);
    if (resolution.internalDisplayResolution) {
      content = upsertTomlKey(content, 'internal_display_resolution', resolution.internalDisplayResolution);
    }
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, content, 'utf8');
};

const applyProfileToXeniaConfig = (emulatorPath, documentsPath, settings) => {
  const paths = resolveXeniaConfigPaths(emulatorPath, documentsPath);
  for (const configPath of paths) {
    try {
      applyProfileToConfigFile(configPath, settings);
    } catch (err) {
      console.warn(`[xenia-profile] Failed to patch ${configPath}:`, err.message);
    }
  }
  return paths;
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

const applyXeniaProfile = (emulatorPath, documentsPath, settings, titleId) => {
  applyXeniaUiSettings(emulatorPath, documentsPath, settings);
  const globalPaths = applyProfileToXeniaConfig(emulatorPath, documentsPath, settings);
  const gamePath = writePerGameXeniaConfig(emulatorPath, titleId, settings);
  return { globalPaths, gameConfigPath: gamePath };
};

const applyLaunchDisplaySettings = (emulatorPath, documentsPath, settings, titleId) => {
  if (settings?.isArcade) {
    return { globalPaths: [], gameConfigPath: null, skipped: true };
  }

  applyXeniaUiSettings(emulatorPath, documentsPath, settings);
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
module.exports.applyLaunchDisplaySettings = applyLaunchDisplaySettings;
module.exports.buildProfileToml = buildProfileToml;
module.exports.normalizeTitleId = normalizeTitleId;
module.exports.isTruthy = isTruthy;