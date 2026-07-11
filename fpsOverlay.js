const { BrowserWindow, desktopCapturer } = require('electron');
const path = require('path');

const DISCOVERY_MS = 2000;

let overlayWindow = null;
let discoveryTimer = null;
let currentSourceId = null;

const stopDiscovery = () => {
  if (discoveryTimer) {
    clearInterval(discoveryTimer);
    discoveryTimer = null;
  }
  currentSourceId = null;
};

const findXeniaSource = async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 0, height: 0 }
  });
  return sources.find((entry) => (entry.name || '').toLowerCase().includes('xenia')) || null;
};

const sendSourceToOverlay = (source) => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayWindow.webContents.send('fps-source', {
    id: source ? source.id : null,
    name: source ? source.name : null
  });
};

const startDiscovery = () => {
  if (discoveryTimer) return;

  const tick = async () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      stopDiscovery();
      return;
    }
    try {
      const source = await findXeniaSource();
      const id = source ? source.id : null;
      if (id !== currentSourceId) {
        currentSourceId = id;
        sendSourceToOverlay(source);
      }
    } catch (err) {
      console.warn('[fps-overlay] window discovery failed:', err.message);
    }
  };

  tick();
  discoveryTimer = setInterval(tick, DISCOVERY_MS);
};

const createFpsOverlay = () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow;

  overlayWindow = new BrowserWindow({
    width: 148,
    height: 56,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'fpsOverlayPreload.js')
    }
  });

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.loadFile(path.join(__dirname, 'fpsOverlay.html'));
  overlayWindow.setPosition(16, 16);

  overlayWindow.webContents.on('did-finish-load', () => {
    currentSourceId = null;
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    stopDiscovery();
  });

  return overlayWindow;
};

const showFpsOverlay = () => {
  const win = createFpsOverlay();
  if (!win.isVisible()) {
    win.showInactive();
  }
  win.moveTop();
  startDiscovery();
};

const hideFpsOverlay = () => {
  stopDiscovery();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  overlayWindow = null;
};

module.exports = {
  showFpsOverlay,
  hideFpsOverlay
};
