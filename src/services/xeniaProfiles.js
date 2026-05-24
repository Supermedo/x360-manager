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

export const buildLaunchConfig = (profile, gameConfig = {}, settings = {}) => {
  const presetsOn = settings?.xeniaPresetsEnabled !== false;
  const base = presetsOn && profile?.settings ? profile.settings : {};
  const game = gameConfig || {};

  return {
    ...base,
    ...game,
    xeniaPresetsEnabled: presetsOn,
    fullscreen: game.fullscreen !== undefined && game.fullscreen !== null
      ? game.fullscreen
      : (base.fullscreen ?? settings.defaultFullscreen ?? false),
    vsync: game.vsync !== undefined && game.vsync !== null
      ? game.vsync
      : (base.vsync ?? settings.defaultVsync ?? true),
    resolution: game.resolution || base.resolution || settings.defaultResolution || 'auto',
    resolutionScale: game.resolutionScale || base.resolutionScale || settings.defaultResolutionScale,
    renderer: game.renderer || base.renderer || settings.defaultRenderer || 'auto',
    frameLimit: game.frameLimit || base.frameLimit || 'auto',
    textureCache: game.textureCache ?? base.textureCache ?? settings.textureCache ?? false,
    gpuReadback: game.gpuReadback ?? base.gpuReadback ?? settings.gpuReadback ?? false,
    asyncShaderCompilation: game.asyncShaderCompilation ?? base.asyncShaderCompilation ?? true,
    showFPS: game.showFPS ?? base.showFPS ?? settings.showFPS ?? false,
    showStats: game.showStats ?? base.showStats ?? false,
    debugMode: game.debugMode ?? base.debugMode ?? false,
    logLevel: game.logLevel || base.logLevel || 'info',
    languageOverride: game.languageOverride || base.languageOverride || 'auto',
    customArgs: game.customArgs || base.customArgs || settings.customEmulatorArgs || ''
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
