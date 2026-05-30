const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  selectEmulatorPath: () => ipcRenderer.invoke('select-emulator-path'),
  selectGameFile: () => ipcRenderer.invoke('select-game-file'),
  selectMultipleGameFiles: () => ipcRenderer.invoke('select-multiple-game-files'),
  selectDlcFiles: () => ipcRenderer.invoke('select-dlc-files'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),
  scanDirectory: (directoryPath) => ipcRenderer.invoke('scan-directory', directoryPath),

  // Emulator operations
  downloadEmulator: (url, downloadPath) => ipcRenderer.invoke('download-emulator', url, downloadPath),
  launchGame: (emulatorPath, gamePath, config) => ipcRenderer.invoke('launch-game', emulatorPath, gamePath, config),
  getEmulatorSession: () => ipcRenderer.invoke('get-emulator-session'),
  onEmulatorSessionChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('emulator-session-changed', listener);
    return () => ipcRenderer.removeListener('emulator-session-changed', listener);
  },

  // Validation operations
  validateEmulator: (emulatorPath) => ipcRenderer.invoke('validate-emulator', emulatorPath),
  validateGameFile: (gamePath) => ipcRenderer.invoke('validate-game-file', gamePath),
  testEmulatorLaunch: (emulatorPath) => ipcRenderer.invoke('test-emulator-launch', emulatorPath),

  // System operations
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadAppUpdate: () => ipcRenderer.invoke('download-app-update'),
  installAppUpdate: () => ipcRenderer.invoke('install-app-update'),
  onUpdateStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('app-update-status', listener);
    return () => ipcRenderer.removeListener('app-update-status', listener);
  },
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  storageGet: (key) => ipcRenderer.invoke('storage-get', key),
  storageSet: (key, data) => ipcRenderer.invoke('storage-set', key, data),
  storageGetPath: () => ipcRenderer.invoke('storage-get-path'),
  coverCacheExists: (url) => ipcRenderer.invoke('cover-cache-exists', url),
  getCoverCacheStats: () => ipcRenderer.invoke('get-cover-cache-stats'),
  clearCoverCache: () => ipcRenderer.invoke('clear-cover-cache'),
  setFullScreen: (enabled) => ipcRenderer.invoke('set-fullscreen', enabled),
  isFullScreen: () => ipcRenderer.invoke('is-fullscreen'),
  toggleFullScreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  onFullscreenChanged: (callback) => {
    const listener = (_event, isFullscreen) => callback(Boolean(isFullscreen));
    ipcRenderer.on('app-fullscreen-changed', listener);
    return () => ipcRenderer.removeListener('app-fullscreen-changed', listener);
  },
  getAppIconUrl: () => ipcRenderer.invoke('get-app-icon-url'),
  applyXeniaUiSettings: (emulatorPath, config) =>
    ipcRenderer.invoke('apply-xenia-ui-settings', emulatorPath, config),
  applyXeniaProfile: (emulatorPath, profileSettings, titleId) =>
    ipcRenderer.invoke('apply-xenia-profile', emulatorPath, profileSettings, titleId),
  exportXeniaProfileToml: (profileSettings) =>
    ipcRenderer.invoke('export-xenia-profile-toml', profileSettings),
  openXeniaConfigFolder: (emulatorPath) =>
    ipcRenderer.invoke('open-xenia-config-folder', emulatorPath),
  listXboxLiveProfiles: (emulatorPath) =>
    ipcRenderer.invoke('list-xbox-live-profiles', emulatorPath),
  saveXboxLiveProfile: (emulatorPath, profile, setActive) =>
    ipcRenderer.invoke('save-xbox-live-profile', emulatorPath, profile, setActive),
  createXboxLiveProfile: (emulatorPath, options) =>
    ipcRenderer.invoke('create-xbox-live-profile', emulatorPath, options),
  verifyXboxLiveProfilePin: (emulatorPath, profileKey, pin) =>
    ipcRenderer.invoke('verify-xbox-live-profile-pin', emulatorPath, profileKey, pin),
  importXboxLiveProfile: (emulatorPath, sourcePath) =>
    ipcRenderer.invoke('import-xbox-live-profile', emulatorPath, sourcePath),
  deleteXboxLiveProfile: (emulatorPath, profileKey) =>
    ipcRenderer.invoke('delete-xbox-live-profile', emulatorPath, profileKey),
  exportXboxLiveProfile: (sourcePath) =>
    ipcRenderer.invoke('export-xbox-live-profile', sourcePath),
  openXboxLiveProfileFolder: (emulatorPath) =>
    ipcRenderer.invoke('open-xbox-live-profile-folder', emulatorPath),
  selectXboxLiveProfileFile: () =>
    ipcRenderer.invoke('select-xbox-live-profile-file'),
  validateCoverUrl: (url, options) => ipcRenderer.invoke('validate-cover-url', url, options),
  cacheCoverImage: (url) => ipcRenderer.invoke('cache-cover-image', url),
  screenScraperSearch: (params) => ipcRenderer.invoke('screenscraper-search', params),
  createDesktopShortcut: (gameName, emulatorPath, gamePath) => ipcRenderer.invoke('create-desktop-shortcut', gameName, emulatorPath, gamePath),
  addToSteam: (gameParams) => ipcRenderer.invoke('add-to-steam', gameParams),
  downloadPatches: (emulatorPath) => ipcRenderer.invoke('download-patches', emulatorPath),
  openPatchesFolder: (emulatorPath) => ipcRenderer.invoke('open-patches-folder', emulatorPath),
  getGamePatches: (params) => ipcRenderer.invoke('get-game-patches', params),
  getAllPatchFiles: (emulatorPath) => ipcRenderer.invoke('get-all-patch-files', emulatorPath),
  toggleGamePatch: (params) => ipcRenderer.invoke('toggle-game-patch', params),
  installGamePatch: (params) => ipcRenderer.invoke('install-game-patch', params),
  deletePatchFile: (patchFilePath) => ipcRenderer.invoke('delete-patch-file', patchFilePath),
  scrapeScreenScraper: (params) => ipcRenderer.invoke('scrape-screenscraper', params),
  getGameSupportedLanguages: (params) => ipcRenderer.invoke('get-game-supported-languages', params),

  // Event listeners
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => callback(progress));
  },

  removeDownloadProgressListener: () => {
    ipcRenderer.removeAllListeners('download-progress');
  }
});