const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fpsOverlayAPI', {
  onSource: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('fps-source', listener);
    return () => ipcRenderer.removeListener('fps-source', listener);
  }
});
