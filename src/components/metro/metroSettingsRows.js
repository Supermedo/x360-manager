import { APP_LANGUAGES } from '../../constants/appLanguages';
import { KEYBOARD_MODE_OPTIONS } from '../../constants/xeniaInputHelp';
import { XENIA_GAME_LANGUAGE_OPTIONS, normalizeDefaultLanguage } from '../../constants/xeniaLanguages';
import { loadAllProfiles } from '../../services/xeniaProfiles';

export const CONSOLE_APP_TABS = [
  { id: 'interface', labelKey: 'tabInterface' },
  { id: 'paths', labelKey: 'tabDirectories' },
  { id: 'profiles', labelKey: 'tabGraphicsPresets' },
  { id: 'xboxlive', labelKey: 'tabXboxLive' },
  { id: 'graphics', labelKey: 'tabGraphics' },
  { id: 'system', labelKey: 'tabSystem' },
  { id: 'audio', labelKey: 'tabAudio' },
  { id: 'advanced', labelKey: 'tabAdvanced' },
  { id: 'danger', labelKey: 'tabDanger' }
];

const shortPath = (p) => {
  if (!p) return 'Not set';
  const parts = String(p).split(/[\\/]/);
  if (parts.length <= 2) return p;
  return `…/${parts.slice(-2).join('/')}`;
};

const xeniaProfileOptions = () =>
  loadAllProfiles().map((p) => ({ value: p.id, label: p.name }));

const langOverrideOptions = () => [
  { value: 'auto', label: 'Auto' },
  ...XENIA_GAME_LANGUAGE_OPTIONS
];

/** Rows for one settings tab — controller-navigable, mirrors desktop Settings. */
export const buildAppTabRows = (tabId, settings, t, isFullscreen) => {
  switch (tabId) {
    case 'interface':
      return [
        { id: 'sec-if', type: 'section', label: t('interfaceTitle') },
        {
          id: 'language',
          type: 'cycle',
          label: t('appLanguage'),
          options: APP_LANGUAGES.map((l) => ({ value: l.code, label: l.nativeLabel })),
          getValue: () => settings.language || 'en',
          apply: (ctx, value) => ctx.updateSettings({ language: value })
        },
        {
          id: 'theme',
          type: 'cycle',
          label: t('theme'),
          options: [
            { value: 'dark', label: t('themeDark') },
            { value: 'light', label: t('themeLight') }
          ],
          getValue: () => settings.theme || 'dark',
          apply: (ctx, value) => ctx.updateSettings({ theme: value })
        },
        {
          id: 'betaMetroConsole',
          type: 'toggle',
          label: t('metroConsoleLabel'),
          getValue: () => Boolean(settings.betaMetroConsole),
          apply: (ctx, value) => ctx.updateSettings({ betaMetroConsole: value })
        },
        {
          id: 'appFullscreen',
          type: 'toggle',
          label: t('fullscreenAppWindow'),
          getValue: () => Boolean(isFullscreen),
          apply: async (ctx, value) => ctx.setFullscreen(value)
        }
      ];

    case 'paths':
      return [
        { id: 'sec-paths', type: 'section', label: t('emulatorConfigurationTitle') },
        {
          id: 'emulatorPath',
          type: 'action',
          label: t('xeniaExecutablePath'),
          action: 'browseEmulatorPath',
          getValue: () => shortPath(settings.emulatorPath)
        },
        {
          id: 'gamesDirectory',
          type: 'action',
          label: t('defaultGamesDirectory'),
          action: 'browseGamesDirectory',
          getValue: () => shortPath(settings.gamesDirectory)
        },
        {
          id: 'scanGames',
          type: 'action',
          label: t('scanDirectoryForGames'),
          action: 'scanGames',
          getValue: () => (settings.gamesDirectory ? 'Run scan' : 'Set folder first')
        }
      ];

    case 'profiles':
      return [
        { id: 'sec-prof', type: 'section', label: t('tabGraphicsPresets') },
        {
          id: 'defaultXeniaProfileId',
          type: 'cycle',
          label: 'Default launch preset',
          options: xeniaProfileOptions(),
          getValue: () => settings.defaultXeniaProfileId || 'builtin-balanced',
          apply: (ctx, value) => ctx.updateSettings({ defaultXeniaProfileId: value })
        },
        {
          id: 'xeniaPresetsEnabled',
          type: 'toggle',
          label: 'Use Xenia presets on launch',
          getValue: () => settings.xeniaPresetsEnabled !== false,
          apply: (ctx, value) => ctx.updateSettings({ xeniaPresetsEnabled: value })
        }
      ];

    case 'xboxlive':
      return [
        { id: 'sec-xl', type: 'section', label: t('tabXboxLive') },
        {
          id: 'sessionGamertag',
          type: 'info',
          label: 'Signed in as',
          getValue: () => settings.sessionGamertag || 'Player'
        },
        {
          id: 'switchProfile',
          type: 'action',
          label: 'Switch profile',
          action: 'switchProfile'
        },
        {
          id: 'askProfileOnLaunch',
          type: 'toggle',
          label: "Ask who's playing on launch",
          getValue: () => settings.askProfileOnLaunch !== false,
          apply: (ctx, value) => ctx.updateSettings({ askProfileOnLaunch: value })
        }
      ];

    case 'graphics':
      return [
        { id: 'sec-gfx', type: 'section', label: t('graphicsSettingsTitle') },
        {
          id: 'defaultRenderer',
          type: 'cycle',
          label: t('rendererGpuApi'),
          options: [
            { value: 'auto', label: t('rendererAutoRecommended') },
            { value: 'd3d12', label: t('rendererD3d12') },
            { value: 'vulkan', label: t('rendererVulkan') }
          ],
          getValue: () => settings.defaultRenderer || settings.defaultGpuBackend || 'auto',
          apply: (ctx, value) => ctx.updateSettings({ defaultRenderer: value, defaultGpuBackend: value })
        },
        {
          id: 'defaultResolutionScale',
          type: 'cycle',
          label: t('resolutionScale'),
          options: [
            { value: '1', label: t('resolution1x') },
            { value: '2', label: t('resolution2x') },
            { value: '3', label: t('resolution3x') }
          ],
          getValue: () => String(settings.defaultResolutionScale || '1').replace(/x$/i, ''),
          apply: (ctx, value) => ctx.updateSettings({ defaultResolutionScale: value })
        },
        {
          id: 'defaultFullscreen',
          type: 'toggle',
          label: t('launchGamesFullscreen'),
          getValue: () => Boolean(settings.defaultFullscreen),
          apply: (ctx, value) => ctx.updateSettings({ defaultFullscreen: value })
        },
        {
          id: 'defaultVsync',
          type: 'toggle',
          label: t('enableVsync'),
          getValue: () => settings.defaultVsync !== false,
          apply: (ctx, value) => ctx.updateSettings({ defaultVsync: value })
        },
        {
          id: 'showFPS',
          type: 'toggle',
          label: t('showInGameFpsCounter'),
          getValue: () => Boolean(settings.showFPS),
          apply: (ctx, value) => ctx.updateSettings({ showFPS: value })
        }
      ];

    case 'system':
      return [
        { id: 'sec-sys', type: 'section', label: t('tabSystem') },
        {
          id: 'defaultLanguage',
          type: 'cycle',
          label: t('defaultGameLanguage'),
          options: XENIA_GAME_LANGUAGE_OPTIONS,
          getValue: () => normalizeDefaultLanguage(settings.defaultLanguage),
          apply: (ctx, value) => ctx.updateSettings({ defaultLanguage: value })
        },
        {
          id: 'checkUpdates',
          type: 'toggle',
          label: t('checkUpdates'),
          getValue: () => settings.checkUpdates !== false,
          apply: (ctx, value) => ctx.updateSettings({ checkUpdates: value })
        },
        {
          id: 'autoSaveStates',
          type: 'toggle',
          label: 'Auto-save states',
          getValue: () => settings.autoSaveStates !== false,
          apply: (ctx, value) => ctx.updateSettings({ autoSaveStates: value })
        }
      ];

    case 'audio':
      return [
        { id: 'sec-audio', type: 'section', label: t('audioSettingsTitle') },
        {
          id: 'defaultAudioDriver',
          type: 'cycle',
          label: t('audioBackend'),
          options: [{ value: 'auto', label: t('audioBackendAuto') }],
          getValue: () => settings.defaultAudioDriver || 'auto',
          apply: (ctx, value) => ctx.updateSettings({ defaultAudioDriver: value })
        },
        {
          id: 'masterVolume',
          type: 'cycle',
          label: 'Master volume',
          options: [
            { value: '0', label: '0%' },
            { value: '25', label: '25%' },
            { value: '50', label: '50%' },
            { value: '75', label: '75%' },
            { value: '100', label: '100%' }
          ],
          getValue: () => String(settings.masterVolume ?? 100),
          apply: (ctx, value) => ctx.updateSettings({ masterVolume: Number(value) })
        },
        {
          id: 'muteInBackground',
          type: 'toggle',
          label: 'Mute in background',
          getValue: () => Boolean(settings.muteInBackground),
          apply: (ctx, value) => ctx.updateSettings({ muteInBackground: value })
        }
      ];

    case 'advanced':
      return [
        { id: 'sec-adv', type: 'section', label: t('advancedHacksTitle') },
        {
          id: 'textureCache',
          type: 'toggle',
          label: t('mountCache'),
          getValue: () => Boolean(settings.textureCache),
          apply: (ctx, value) => ctx.updateSettings({ textureCache: value })
        },
        {
          id: 'gpuReadback',
          type: 'toggle',
          label: t('d3d12ReadbackResolve'),
          getValue: () => Boolean(settings.gpuReadback),
          apply: (ctx, value) => ctx.updateSettings({ gpuReadback: value })
        },
        { id: 'sec-cache', type: 'section', label: t('coverCacheTitle') },
        {
          id: 'coverCacheInfo',
          type: 'info',
          label: 'Cached covers',
          getValue: () => settings._coverCacheLabel || t('loadingCacheInfo')
        },
        {
          id: 'refreshCoverCache',
          type: 'action',
          label: t('refresh'),
          action: 'refreshCoverCache'
        },
        {
          id: 'clearCoverCache',
          type: 'action',
          label: t('clearCoverCache'),
          action: 'clearCoverCache'
        },
        { id: 'sec-patches', type: 'section', label: t('gamePatchesTitle') },
        {
          id: 'downloadPatches',
          type: 'action',
          label: t('downloadLatestPatches'),
          action: 'downloadPatches'
        },
        {
          id: 'openPatchesFolder',
          type: 'action',
          label: t('openPatchesFolder'),
          action: 'openPatchesFolder'
        }
      ];

    case 'danger':
      return [
        { id: 'sec-danger', type: 'section', label: t('resetEverythingTitle') },
        {
          id: 'runSetupWizard',
          type: 'action',
          label: t('runSetupWizardAgain'),
          action: 'runSetupWizard'
        },
        {
          id: 'resetSettings',
          type: 'action',
          label: t('resetConfiguration'),
          action: 'resetSettings'
        },
        {
          id: 'exitConsole',
          type: 'action',
          label: 'Exit Console Mode',
          action: 'exitConsole'
        }
      ];

    default:
      return [];
  }
};

export const buildGameSettingRows = (game, settings, t) => {
  const cfg = game?.config || {};
  return [
    { id: 'g-section', type: 'section', label: game?.name || 'Game' },
    {
      id: 'g-xeniaProfile',
      type: 'cycle',
      label: 'Launch preset',
      options: [{ value: '', label: 'Custom' }, ...xeniaProfileOptions()],
      getValue: () => cfg.xeniaProfileId || '',
      apply: (ctx, value) => ctx.saveGameConfig({ xeniaProfileId: value || undefined })
    },
    {
      id: 'g-fullscreen',
      type: 'toggle',
      label: t('launchGamesFullscreen'),
      getValue: () => Boolean(cfg.fullscreen ?? settings.defaultFullscreen ?? false),
      apply: (ctx, value) => ctx.saveGameConfig({ fullscreen: value })
    },
    {
      id: 'g-vsync',
      type: 'toggle',
      label: t('enableVsync'),
      getValue: () => Boolean(cfg.vsync ?? settings.defaultVsync !== false),
      apply: (ctx, value) => ctx.saveGameConfig({ vsync: value })
    },
    {
      id: 'g-showFPS',
      type: 'toggle',
      label: t('showInGameFpsCounter'),
      getValue: () => Boolean(cfg.showFPS ?? settings.showFPS ?? false),
      apply: (ctx, value) => ctx.saveGameConfig({ showFPS: value })
    },
    {
      id: 'g-resolution',
      type: 'cycle',
      label: t('resolutionScale'),
      options: [
        { value: '1', label: t('resolution1x') },
        { value: '2', label: t('resolution2x') },
        { value: '3', label: t('resolution3x') }
      ],
      getValue: () => String(cfg.resolutionScale || settings.defaultResolutionScale || '1').replace(/x$/i, ''),
      apply: (ctx, value) => ctx.saveGameConfig({ resolutionScale: value })
    },
    {
      id: 'g-renderer',
      type: 'cycle',
      label: t('rendererGpuApi'),
      options: [
        { value: 'auto', label: t('rendererAutoRecommended') },
        { value: 'd3d12', label: t('rendererD3d12') },
        { value: 'vulkan', label: t('rendererVulkan') }
      ],
      getValue: () => cfg.renderer || settings.defaultRenderer || 'auto',
      apply: (ctx, value) => ctx.saveGameConfig({ renderer: value })
    },
    {
      id: 'g-language',
      type: 'cycle',
      label: t('defaultGameLanguage'),
      options: langOverrideOptions(),
      getValue: () => cfg.languageOverride || 'auto',
      apply: (ctx, value) => ctx.saveGameConfig({ languageOverride: value })
    },
    {
      id: 'g-keyboard',
      type: 'cycle',
      label: 'Keyboard mode',
      options: KEYBOARD_MODE_OPTIONS,
      getValue: () => String(cfg.keyboardMode ?? (cfg.keyboardSupport ? '1' : '0')),
      apply: (ctx, value) => ctx.saveGameConfig({
        keyboardMode: value,
        keyboardSupport: value !== '0'
      })
    },
    {
      id: 'g-textureCache',
      type: 'toggle',
      label: t('mountCache'),
      getValue: () => Boolean(cfg.textureCache ?? settings.textureCache ?? false),
      apply: (ctx, value) => ctx.saveGameConfig({ textureCache: value })
    },
    {
      id: 'g-gpuReadback',
      type: 'toggle',
      label: t('d3d12ReadbackResolve'),
      getValue: () => Boolean(cfg.gpuReadback ?? settings.gpuReadback ?? false),
      apply: (ctx, value) => ctx.saveGameConfig({ gpuReadback: value })
    },
    {
      id: 'g-asyncShader',
      type: 'toggle',
      label: 'Async shader compile',
      getValue: () => cfg.asyncShaderCompilation !== false,
      apply: (ctx, value) => ctx.saveGameConfig({ asyncShaderCompilation: value })
    },
    {
      id: 'g-vibration',
      type: 'toggle',
      label: 'Controller vibration',
      getValue: () => cfg.vibrationEnabled !== false,
      apply: (ctx, value) => ctx.saveGameConfig({ vibrationEnabled: value })
    },
    { id: 'g-actions', type: 'section', label: 'Actions' },
    { id: 'g-patches', type: 'action', label: t('configurePatches'), action: 'configurePatches' },
    { id: 'g-launch', type: 'action', label: 'Launch Game', action: 'launch' },
    {
      id: 'g-favorite',
      type: 'toggle',
      label: 'Favorite',
      getValue: () => Boolean(game.isFavorite),
      apply: (ctx, value) => ctx.setFavorite?.(value)
    }
  ];
};

export const selectableRowIndices = (rows) =>
  rows.map((row, i) => (row.type === 'section' || row.type === 'info' ? -1 : i)).filter((i) => i >= 0);
