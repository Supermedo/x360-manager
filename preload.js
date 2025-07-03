const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  selectEmulatorPath: () => ipcRenderer.invoke('select-emulator-path'),
  selectGameFile: () => ipcRenderer.invoke('select-game-file'),
  selectMultipleGameFiles: () => ipcRenderer.invoke('select-multiple-game-files'),
  selectDlcFiles: () => ipcRenderer.invoke('select-dlc-files'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanDirectory: (directoryPath) => ipcRenderer.invoke('scan-directory', directoryPath),
  
  // Emulator operations
  downloadEmulator: (url, downloadPath) => ipcRenderer.invoke('download-emulator', url, downloadPath),
  launchGame: (emulatorPath, gamePath, config) => ipcRenderer.invoke('launch-game', emulatorPath, gamePath, config),
  
  // Validation operations
  validateEmulator: (emulatorPath) => ipcRenderer.invoke('validate-emulator', emulatorPath),
  validateGameFile: (gamePath) => ipcRenderer.invoke('validate-game-file', gamePath),
  testEmulatorLaunch: (emulatorPath) => ipcRenderer.invoke('test-emulator-launch', emulatorPath),
  
  // System operations
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Event listeners
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => callback(progress));
  },
  
  removeDownloadProgressListener: () => {
    ipcRenderer.removeAllListeners('download-progress');
  }
});