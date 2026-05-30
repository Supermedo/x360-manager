import { mapLanguageToXeniaId } from '../constants/xeniaLanguages';

export const PROFILES_STORAGE_KEY = 'x360-xenia-profiles';

export const BUILTIN_PROFILES = [
  {
    id: 'builtin-native',
    name: 'Native 720p',
    description: 'Default Xbox 360 resolution, VSync on. Best compatibility.',
    builtin: true,
    settings: {
      resolution: '1280x720',
      renderer: 'auto',
      fullscreen: false,
      vsync: true,
      frameLimit: '60',
      textureCache: false,
      gpuReadback: false,
      asyncShaderCompilation: true,
      showFPS: false,
      debugMode: false
    }
  },
  {
    id: 'builtin-performance',
    name: 'Performance',
    description: 'Vulkan, VSync off, mount cache. Higher FPS on strong PCs.',
    builtin: true,
    settings: {
      resolution: '1280x720',
      renderer: 'vulkan',
      fullscreen: false,
      vsync: false,
      frameLimit: 'unlimited',
      textureCache: true,
      gpuReadback: false,
      asyncShaderCompilation: true,
      showFPS: false,
      debugMode: false
    }
  },
  {
    id: 'builtin-balanced',
    name: 'Balanced 1080p',
    description: '1080p internal display, auto GPU, VSync on.',
    builtin: true,
    settings: {
      resolution: '1920x1080',
      renderer: 'auto',
      fullscreen: false,
      vsync: true,
      frameLimit: '60',
      textureCache: false,
      gpuReadback: false,
      asyncShaderCompilation: true,
      showFPS: false,
      debugMode: false
    }
  },
  {
    id: 'builtin-quality',
    name: 'Quality 1440p',
    description: '1440p scale with VSync. Sharper image on mid-high GPUs.',
    builtin: true,
    settings: {
      resolution: '2560x1440',
      renderer: 'd3d12',
      fullscreen: false,
      vsync: true,
      frameLimit: '60',
      textureCache: true,
      gpuReadback: false,
      asyncShaderCompilation: true,
      showFPS: false,
      debugMode: false
    }
  },
  {
    id: 'builtin-4k',
    name: '4K Ultra',
    description: '4K internal resolution. Requires a powerful GPU.',
    builtin: true,
    settings: {
      resolution: '3840x2160',
      renderer: 'd3d12',
      fullscreen: true,
      vsync: true,
      frameLimit: '60',
      textureCache: true,
      gpuReadback: false,
      asyncShaderCompilation: true,
      showFPS: false,
      debugMode: false
    }
  },
  {
    id: 'builtin-debug',
    name: 'Debug / FPS',
    description: 'Profiler overlay and debug logging. Press F3 in-game for FPS.',
    builtin: true,
    settings: {
      resolution: '1280x720',
      renderer: 'auto',
      fullscreen: false,
      vsync: true,
      frameLimit: '60',
      textureCache: false,
      gpuReadback: false,
      asyncShaderCompilation: true,
      showFPS: true,
      showStats: true,
      debugMode: true,
      logLevel: 'debug'
    }
  }
];

const loadCustomProfilesFromStorage = () => {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    const custom = raw ? JSON.parse(raw) : [];
    return Array.isArray(custom) ? custom.filter((p) => p && p.id && !p.builtin) : [];
  } catch {
    return [];
  }
};

export const loadAllProfiles = () => {
  const validCustom = loadCustomProfilesFromStorage();
  return [...BUILTIN_PROFILES, ...validCustom];
};

export const loadAllProfilesAsync = async () => {
  if (window.electronAPI?.storageGet) {
    try {
      const fromDisk = await window.electronAPI.storageGet('xeniaProfiles');
      if (Array.isArray(fromDisk)) {
        const validCustom = fromDisk.filter((p) => p && p.id && !p.builtin);
        return [...BUILTIN_PROFILES, ...validCustom];
      }
    } catch {
      // fall through
    }
  }
  return loadAllProfiles();
};

export const saveCustomProfiles = (profiles) => {
  const custom = profiles.filter((p) => !p.builtin);
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(custom));
  if (window.electronAPI?.storageSet) {
    window.electronAPI.storageSet('xeniaProfiles', custom);
  }
};

export const getProfileById = (profiles, id) => {
  if (!id) return null;
  return profiles.find((p) => p.id === id) || null;
};

export const createCustomProfile = (name, settings, description = '') => ({
  id: `custom-${Date.now()}`,
  name: name.trim() || 'Custom Profile',
  description: description.trim() || 'User-created Xenia profile',
  builtin: false,
  settings: { ...settings },
  createdAt: new Date().toISOString()
});

const LAUNCH_CONFIG_SKIP = new Set([
  'xeniaProfileId',
  'dlcFiles',
  'saveFiles',
  'saveBackupPath',
  'autoBackupEnabled'
]);

export const normalizeRenderer = (renderer) => {
  if (!renderer || renderer === 'auto') return 'auto';
  const value = String(renderer).toLowerCase();
  if (value === 'directx12' || value === 'd3d12') return 'd3d12';
  if (value === 'directx11' || value === 'd3d11') return 'd3d11';
  return value;
};

const isMeaningfulGameOverride = (key, value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return true;
  if (value === 'auto' || value === 'default' || value === '') return false;
  if (key === 'customArgs' && !String(value).trim()) return false;
  return true;
};

export const resolutionFromScale = (scale) => {
  const map = { '1': '1280x720', '1x': '1280x720', '2': '1920x1080', '2x': '1920x1080', '3': '2560x1440', '3x': '2560x1440' };
  return map[String(scale || '').toLowerCase()] || null;
};

export const buildLaunchConfig = (profile, gameConfig = {}, settings = {}) => {
  const presetsOn = settings?.xeniaPresetsEnabled !== false;
  const base = presetsOn && profile?.settings ? { ...profile.settings } : {};
  const game = { ...(gameConfig || {}) };
  const merged = { ...base };

  for (const [key, value] of Object.entries(game)) {
    if (LAUNCH_CONFIG_SKIP.has(key)) continue;
    if (isMeaningfulGameOverride(key, value)) {
      merged[key] = key === 'renderer' ? normalizeRenderer(value) : value;
    }
  }

  const defaultResolution =
    settings.defaultResolution || resolutionFromScale(settings.defaultResolutionScale) || 'auto';

  return {
    ...merged,
    xeniaPresetsEnabled: presetsOn,
    fullscreen:
      merged.fullscreen !== undefined && merged.fullscreen !== null
        ? merged.fullscreen
        : (settings.defaultFullscreen ?? false),
    vsync:
      merged.vsync !== undefined && merged.vsync !== null
        ? merged.vsync
        : (settings.defaultVsync ?? true),
    resolution: merged.resolution || defaultResolution,
    resolutionScale: merged.resolutionScale || settings.defaultResolutionScale,
    renderer: normalizeRenderer(merged.renderer || settings.defaultRenderer || 'auto'),
    frameLimit: merged.frameLimit || 'auto',
    textureCache: merged.textureCache ?? false,
    gpuReadback: merged.gpuReadback ?? false,
    asyncShaderCompilation: merged.asyncShaderCompilation ?? true,
    showFPS: merged.showFPS ?? settings.showFPS ?? false,
    showStats: merged.showStats ?? false,
    debugMode: merged.debugMode ?? false,
    logLevel: merged.logLevel || 'info',
    languageOverride: merged.languageOverride || 'auto',
    userLanguage: mapLanguageToXeniaId(
      merged.languageOverride && merged.languageOverride !== 'auto' ? merged.languageOverride : null
    ) ?? undefined,
    keyboardMode:
      merged.keyboardMode != null && merged.keyboardMode !== ''
        ? Number(merged.keyboardMode)
        : merged.keyboardSupport === true
          ? 1
          : 0,
    keyboardSupport: (merged.keyboardMode != null && Number(merged.keyboardMode) > 0) || merged.keyboardSupport === true,
    customArgs: merged.customArgs || settings.customEmulatorArgs || settings.defaultCustomArgs || ''
  };
};

export const resolveActiveProfile = (profiles, game, settings) => {
  if (settings?.xeniaPresetsEnabled === false) {
    return null;
  }
  const profileId = game?.config?.xeniaProfileId;
  if (!profileId) {
    return null;
  }
  return getProfileById(profiles, profileId);
};
