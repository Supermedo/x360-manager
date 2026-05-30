const { autoUpdater } = require('electron-updater');
const { app } = require('electron');
const isDev = require('electron-is-dev');

const GITHUB_RELEASES_URL = 'https://github.com/Supermedo/x360-manager/releases';

let mainWindow = null;
let updateCheckTimer = null;

const isUpdaterDisabled = () =>
  isDev
  || process.env.ELECTRON_IS_DEV === '1'
  || !app.isPackaged;

const sendStatus = (payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-update-status', payload);
  }
};

const initAppUpdater = (win) => {
  mainWindow = win;
  if (isUpdaterDisabled()) {
    sendStatus({
      status: 'disabled',
      currentVersion: app.getVersion(),
      reason: 'development'
    });
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    sendStatus({ status: 'checking', currentVersion: app.getVersion() });
  });

  autoUpdater.on('update-available', (info) => {
    sendStatus({
      status: 'available',
      currentVersion: app.getVersion(),
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseUrl: GITHUB_RELEASES_URL
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendStatus({
      status: 'not-available',
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on('error', (err) => {
    console.warn('[updater]', err.message);
    sendStatus({
      status: 'error',
      currentVersion: app.getVersion(),
      error: err.message
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendStatus({
      status: 'downloading',
      currentVersion: app.getVersion(),
      percent: Math.round(progress.percent || 0)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus({
      status: 'downloaded',
      currentVersion: app.getVersion(),
      version: info.version
    });
  });
};

const checkForUpdates = async ({ silent = true } = {}) => {
  if (isUpdaterDisabled()) {
    return {
      ok: false,
      disabled: true,
      currentVersion: app.getVersion(),
      reason: 'development'
    };
  }

  try {
    sendStatus({ status: 'checking', currentVersion: app.getVersion() });
    const result = await autoUpdater.checkForUpdates();
    return {
      ok: true,
      currentVersion: app.getVersion(),
      updateInfo: result?.updateInfo || null
    };
  } catch (err) {
    console.warn('[updater] check failed:', err.message);
    sendStatus({
      status: 'error',
      currentVersion: app.getVersion(),
      error: err.message
    });
    return { ok: false, error: err.message, currentVersion: app.getVersion() };
  }
};

const downloadUpdate = async () => {
  if (isUpdaterDisabled()) {
    return { ok: false, error: 'Updates are disabled in development mode.' };
  }
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

const installUpdate = () => {
  if (isUpdaterDisabled()) return { ok: false, error: 'Not available in development.' };
  autoUpdater.quitAndInstall(false, true);
  return { ok: true };
};

const scheduleUpdateCheck = (enabled = true, delayMs = 8000) => {
  if (updateCheckTimer) {
    clearTimeout(updateCheckTimer);
    updateCheckTimer = null;
  }
  if (!enabled || isUpdaterDisabled()) return;

  updateCheckTimer = setTimeout(() => {
    checkForUpdates({ silent: true }).catch((err) => {
      console.warn('[updater] scheduled check failed:', err.message);
    });
  }, delayMs);
};

module.exports = {
  initAppUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  scheduleUpdateCheck,
  GITHUB_RELEASES_URL
};
