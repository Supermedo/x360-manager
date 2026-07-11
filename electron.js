const { app, BrowserWindow, ipcMain, dialog, shell, protocol, nativeImage } = require('electron');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL, fileURLToPath } = require('url');
const isDev = require('electron-is-dev');
const fs = require('fs');

const loadEnvFile = (envPath) => {
  if (!envPath || !fs.existsSync(envPath)) return;
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (err) {
    console.warn('[env] Could not load', envPath, err.message);
  }
};

loadEnvFile(path.join(__dirname, '.env'));

const getScreenScraperAuthQuery = () => {
  const user = process.env.SCREENSCRAPER_USER || '';
  const password = process.env.SCREENSCRAPER_PASSWORD || '';
  const devId = process.env.SCREENSCRAPER_DEV_ID || '';
  const devPassword = process.env.SCREENSCRAPER_DEV_PASSWORD || '';
  const softName = process.env.SCREENSCRAPER_SOFTNAME || 'X360 Manager';
  if (!user || !password || !devId || !devPassword) {
    return null;
  }
  return (
    `&devid=${encodeURIComponent(devId)}`
    + `&devpassword=${encodeURIComponent(devPassword)}`
    + `&softname=${encodeURIComponent(softName)}`
    + `&ssid=${encodeURIComponent(user)}`
    + `&sspassword=${encodeURIComponent(password)}`
    + '&output=json&systemeid=33'
  );
};
const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const {
  applyXeniaUiSettings,
  applyXeniaProfile,
  applyLaunchDisplaySettings,
  buildProfileToml,
  wantsFpsOverlay,
  mapLogLevel,
  getResolutionLaunchArgs,
  isTruthy,
  mapLanguageToXeniaCode,
  resolveKeyboardMode,
  repairXeniaConfigFiles,
  resolveLaunchLanguageCode
} = require('./xeniaConfig');
const {
  inferLanguagesFromTitle,
  inferLanguagesFromPath,
  languagesFromScreenScraperJeu,
  normalizeLanguageCodes,
  resolveLanguageSourceMeta
} = require('./gameLanguageProbe');
const { detectArcadeGame, resolveXeniaLaunchTarget } = require('./xeniaLaunch');
const {
  listXboxLiveProfiles,
  saveXboxLiveProfile,
  createProfile,
  importProfileFile,
  deleteProfile,
  applyXboxLiveProfileToConfig,
  applyActiveProfileForLaunch,
  clearXeniaProfilesForArcadeLaunch,
  exportProfileFile,
  getActiveXboxLiveProfile,
  verifyProfilePin,
  getProfileStorageDir,
  resolveXContentRoot
} = require('./xboxLiveProfiles');
const {
  initAppUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  scheduleUpdateCheck
} = require('./appUpdater');
const {
  findPatchFileForTitle,
  parsePatchFile,
  togglePatchEnabled
} = require('./patchHelpers');
const { showFpsOverlay, hideFpsOverlay } = require('./fpsOverlay');

const toXboxCdnHttpUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  let normalized = url.trim();
  if (normalized.startsWith('//download.xbox.com')) {
    normalized = `http:${normalized}`;
  } else if (/^https:\/\/download\.xbox\.com/i.test(normalized)) {
    normalized = normalized.replace(/^https:\/\/download\.xbox\.com/i, 'http://download.xbox.com');
  }
  return normalized.replace(/^http:\/\/download\.xbox\.com:80\//i, 'http://download.xbox.com/');
};

const downloadCoverToFile = (sourceUrl, destPath) =>
  new Promise((resolve, reject) => {
    const fetchOnce = (url, redirects = 0) => {
      if (redirects > 5) {
        reject(new Error('Too many redirects'));
        return;
      }
      let parsed;
      try {
        parsed = new URL(url);
      } catch (err) {
        reject(err);
        return;
      }
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.get(
        url,
        { headers: { 'User-Agent': 'X360-Manager/1.5.0', Accept: 'image/*,*/*' } },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const next = res.headers.location.startsWith('http')
              ? res.headers.location
              : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
            res.resume();
            fetchOnce(next, redirects + 1);
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 400) {
            res.resume();
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          const file = fs.createWriteStream(destPath);
          res.on('error', (err) => {
            file.close();
            fs.unlink(destPath, () => {});
            reject(err);
          });
          res.pipe(file);
          file.on('finish', () => file.close(() => resolve(destPath)));
          file.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
          });
        }
      );
      req.setTimeout(20000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.on('error', reject);
    };
    fetchOnce(sourceUrl);
  });

const useDevServer = isDev && process.env.ELECTRON_FORCE_BUILD !== '1';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'cover-cache',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

const resolveLocalImagePath = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('file:')) {
    try {
      return fileURLToPath(url);
    } catch {
      return null;
    }
  }
  if (url.startsWith('cover-cache://')) {
    try {
      const parsed = new URL(url);
      let filePath = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
      if (process.platform === 'win32') {
        filePath = filePath.replace(/\//g, '\\');
      }
      return path.normalize(filePath);
    } catch {
      return null;
    }
  }
  return null;
};

const toLocalFileUrl = (absolutePath) => pathToFileURL(absolutePath).href;

let mainWindow;

const activeEmulatorPids = new Set();
let emulatorWatchInterval = null;

const focusMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.moveTop();
    mainWindow.focus();
  } catch (err) {
    console.warn('[focus] Could not refocus main window:', err.message);
  }
};

const stopFpsSampler = () => {
  hideFpsOverlay();
};

const startFpsSampler = () => {
  try {
    showFpsOverlay();
  } catch (err) {
    console.warn('[fps-overlay] Failed to show overlay:', err.message);
  }
};

const isPidRunning = (pid) => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
};

const notifyEmulatorSession = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const running = activeEmulatorPids.size > 0;
  mainWindow.webContents.send('emulator-session-changed', {
    running,
    count: activeEmulatorPids.size
  });
};

const untrackEmulatorPid = (pid) => {
  if (!pid) return;
  activeEmulatorPids.delete(pid);
  if (activeEmulatorPids.size === 0) {
    stopFpsSampler();
    focusMainWindow();
  }
  notifyEmulatorSession();
  if (activeEmulatorPids.size === 0 && emulatorWatchInterval) {
    clearInterval(emulatorWatchInterval);
    emulatorWatchInterval = null;
  }
};

const trackEmulatorPid = (pid) => {
  if (!pid) return;
  activeEmulatorPids.add(pid);
  notifyEmulatorSession();

  if (!emulatorWatchInterval) {
    emulatorWatchInterval = setInterval(() => {
      for (const trackedPid of [...activeEmulatorPids]) {
        if (!isPidRunning(trackedPid)) {
          activeEmulatorPids.delete(trackedPid);
        }
      }
      notifyEmulatorSession();
      if (activeEmulatorPids.size === 0) {
        stopFpsSampler();
        if (emulatorWatchInterval) {
          clearInterval(emulatorWatchInterval);
          emulatorWatchInterval = null;
        }
      }
    }, 1000);
  }
};

const resolveAppIconPath = () => {
  const candidates = [
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(__dirname, 'resources', 'icon.ico'),
    path.join(__dirname, 'resources', 'icon.png'),
    path.join(__dirname, 'build', 'icon.ico'),
    path.join(__dirname, 'build', 'icon.png'),
    path.join(__dirname, 'public', 'icon.png')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const getAppIconImage = () => {
  const iconPath = resolveAppIconPath();
  if (!iconPath) return undefined;
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? undefined : image;
};

const { readJson: readAppStorage, writeJson: writeAppStorage } = require('./appStorage');

if (!isDev) {
  const exeDir = path.dirname(app.getPath('exe'));
  const portableMarker = path.join(exeDir, 'portable.txt');
  if (fs.existsSync(portableMarker)) {
    const portableDataPath = path.join(exeDir, 'data');
    try {
      fs.mkdirSync(portableDataPath, { recursive: true });
      app.setPath('userData', portableDataPath);
    } catch (err) {
      console.warn('[app] Could not set portable data path:', err.message);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:x360-manager'
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a1a',
      symbolColor: '#e8e8e8',
      height: 48
    },
    autoHideMenuBar: true,
    icon: getAppIconImage(),
    show: false
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(
    useDevServer
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, './build/index.html')}`
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    initAppUpdater(mainWindow);
    try {
      const settings = readAppStorage(app.getPath('userData'), 'settings', null);
      scheduleUpdateCheck(settings?.checkUpdates !== false);
    } catch {
      scheduleUpdateCheck(true);
    }
  });

  if (useDevServer) {
    mainWindow.webContents.openDevTools();
  }

  const notifyFullscreenChanged = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('app-fullscreen-changed', mainWindow.isFullScreen());
  };

  mainWindow.on('enter-full-screen', notifyFullscreenChanged);
  mainWindow.on('leave-full-screen', notifyFullscreenChanged);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const DEFAULT_TITLE_BAR_OVERLAY = {
  color: '#1a1a1a',
  symbolColor: '#e8e8e8',
  height: 48
};

const setAppFullscreen = (enabled) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const want = Boolean(enabled);

  // Keep overlay height > 0 so Windows close/minimize/maximize stay clickable in fullscreen.
  if (process.platform === 'win32' && typeof mainWindow.setTitleBarOverlay === 'function') {
    try {
      mainWindow.setTitleBarOverlay(
        want
          ? { color: '#1a1a1a', symbolColor: '#e8e8e8', height: 48 }
          : DEFAULT_TITLE_BAR_OVERLAY
      );
    } catch (err) {
      console.warn('[fullscreen] titleBarOverlay:', err.message);
    }
  }

  if (want) {
    mainWindow.setFullScreen(true);
  } else {
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }
  }

  const isFs = mainWindow.isFullScreen();
  if (!mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-fullscreen-changed', isFs);
  }
  return isFs;
};

app.whenReady().then(() => {
  console.log('[app] Settings and library data folder:', app.getPath('userData'));
  try {
    const settings = readAppStorage(app.getPath('userData'), 'settings', null);
    if (settings?.emulatorPath && fs.existsSync(settings.emulatorPath)) {
      const repaired = repairXeniaConfigFiles(settings.emulatorPath, app.getPath('documents'));
      if (repaired.length) {
        console.log('[app] Repaired Xenia config file(s):', repaired.join(', '));
      }
    }
  } catch (err) {
    console.warn('[app] Xenia config repair skipped:', err.message);
  }
  const coverCacheUrlToPath = (url) => {
    const parsed = new URL(url);
    let filePath = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (process.platform === 'win32') {
      filePath = filePath.replace(/\//g, '\\');
    }
    return path.normalize(filePath);
  };

  protocol.registerFileProtocol('cover-cache', (request, callback) => {
    try {
      const filePath = coverCacheUrlToPath(request.url);
      if (!fs.existsSync(filePath)) {
        callback({ error: -6 });
        return;
      }
      callback({ path: filePath });
    } catch (err) {
      console.error('[cover-cache] protocol error:', err);
      callback({ error: -2 });
    }
  });

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.x360manager.app');
  }
  const dockIcon = getAppIconImage();
  if (dockIcon && app.dock) {
    app.dock.setIcon(dockIcon);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for emulator management
ipcMain.handle('select-emulator-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Executable Files', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('select-game-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Game File',
    filters: [
      { name: 'Game Files', extensions: ['iso', 'xex', 'xbe', 'rom', 'zip', '7z', 'xcp'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-multiple-game-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Multiple Game Files',
    filters: [
      { name: 'Game Files', extensions: ['iso', 'xex', 'xbe', 'rom', 'zip', '7z', 'xcp'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  });

  return result.canceled ? null : result.filePaths;
});

ipcMain.handle('select-dlc-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select DLC Files',
    filters: [
      { name: 'DLC Files', extensions: ['xcp', 'dlc', 'pkg', 'zip', '7z'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  });

  return result.canceled ? null : result.filePaths;
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }

  return null;
});

ipcMain.handle('select-image-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Cover Image File',
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'svg'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return require('url').pathToFileURL(result.filePaths[0]).href;
});

// Download emulator — downloads ZIP, extracts to user-chosen location, returns path to xenia.exe
ipcMain.handle('download-emulator', async (event, url, userDir) => {
  const http = require('https');
  const { createWriteStream, mkdirSync, readdirSync, unlinkSync } = require('fs');

  // Use user-provided directory, or fall back to portable folder
  let emulatorDir;
  if (userDir && userDir.trim()) {
    emulatorDir = userDir;
  } else {
    const baseDir = isDev ? __dirname : path.dirname(app.getPath('exe'));
    emulatorDir = path.join(baseDir, 'emulator');
  }
  mkdirSync(emulatorDir, { recursive: true });

  const zipPath = path.join(emulatorDir, 'xenia_download.zip');

  // Download with redirect following
  const download = (downloadUrl) => {
    return new Promise((resolve, reject) => {
      const doRequest = (reqUrl) => {
        const protocol = reqUrl.startsWith('https') ? require('https') : require('http');
        protocol.get(reqUrl, { headers: { 'User-Agent': 'X360Manager' } }, (response) => {
          // Follow redirects
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            console.log('Redirecting to:', response.headers.location);
            doRequest(response.headers.location);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${response.statusCode}`));
            return;
          }

          const totalSize = parseInt(response.headers['content-length'], 10) || 0;
          let downloaded = 0;
          const fileStream = createWriteStream(zipPath);

          response.on('data', (chunk) => {
            downloaded += chunk.length;
            if (totalSize > 0) {
              const progress = (downloaded / totalSize) * 70; // 70% for download
              mainWindow?.webContents.send('download-progress', progress);
            }
          });

          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(zipPath);
          });
          fileStream.on('error', reject);
        }).on('error', reject);
      };
      doRequest(downloadUrl);
    });
  };

  try {
    console.log('Downloading emulator from:', url);
    mainWindow?.webContents.send('download-progress', 5);
    await download(url);
    console.log('Download complete, extracting...');

    mainWindow?.webContents.send('download-progress', 75);

    // Extract ZIP using PowerShell (built-in on Windows)
    await new Promise((resolve, reject) => {
      const cmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${emulatorDir}' -Force"`;
      exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Extraction error:', error);
          reject(new Error(`Extraction failed: ${error.message}`));
        } else {
          console.log('Extraction complete');
          resolve();
        }
      });
    });

    mainWindow?.webContents.send('download-progress', 95);

    // Clean up the ZIP file
    try { unlinkSync(zipPath); } catch (e) { /* ignore */ }

    // Find the xenia*.exe in the extracted directory
    const findXeniaExe = (dir) => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && entry.name.toLowerCase().startsWith('xenia') && entry.name.toLowerCase().endsWith('.exe')) {
          return fullPath;
        }
        if (entry.isDirectory()) {
          const found = findXeniaExe(fullPath);
          if (found) return found;
        }
      }
      return null;
    };

    const xeniaExePath = findXeniaExe(emulatorDir);
    mainWindow?.webContents.send('download-progress', 100);

    if (xeniaExePath) {
      console.log('Found Xenia at:', xeniaExePath);
      return { success: true, path: xeniaExePath };
    } else {
      console.error('Could not find xenia.exe in extracted files');
      return { success: false, error: 'Could not find xenia.exe in the extracted files' };
    }
  } catch (error) {
    console.error('Download/extract failed:', error);
    throw error;
  }
});

// Handle scanning directories for games
ipcMain.handle('scan-directory', async (event, directoryPath) => {
  try {
    const files = [];
    const supportedFormats = ['.iso', '.cue', '.nrg', '.mdf', '.ccd', '.xex', '.xbe', '.xcp', '.zip', '.7z', '.rom'];

    const scanRecursively = (dir) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Recursively scan subdirectories
          scanRecursively(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath).toLowerCase();

          if (supportedFormats.includes(ext)) {
            // Further optimization: skip obvious junk/tiny files
            if (ext === '.xex' && item.toLowerCase() !== 'default.xex' && stat.size < 1024 * 1024) {
              continue; // Ignore tiny non-default .xex files
            }
            files.push(fullPath);
          } else if (!ext) {
            // For extensionless files (like XBLA/GOD packages), check for Xbox LIVE STFS Header Magic Bytes ('CON ', 'PIRS', 'LIVE')
            // This prevents importing thousands of raw extensionless game assets like 'RainRippleNoise01'
            if (stat.size >= 1024) { // Real Xbox packages are larger than 1KB
              try {
                const fd = fs.openSync(fullPath, 'r');
                const buffer = Buffer.alloc(4);
                fs.readSync(fd, buffer, 0, 4, 0);
                fs.closeSync(fd);

                const magic = buffer.toString('ascii');
                if (magic === 'CON ' || magic === 'LIVE' || magic === 'PIRS') {
                  files.push(fullPath);
                }
              } catch (e) {
                // Ignore read errors (e.g., file locked)
              }
            }
          }
        }
      }
    };

    scanRecursively(directoryPath);
    return files;
  } catch (error) {
    console.error('Error scanning directory:', error);
    throw error;
  }
});

ipcMain.handle('launch-game', async (event, emulatorPath, gamePath, config) => {
  return new Promise((resolve, reject) => {
    // Validate emulator path exists
    if (!fs.existsSync(emulatorPath)) {
      reject(new Error(`Emulator not found at: ${emulatorPath}`));
      return;
    }

    const launchTarget = resolveXeniaLaunchTarget(gamePath, emulatorPath);
    const effectiveGamePath = launchTarget.targetPath;
    const launchCwd = launchTarget.cwd;
    const isArcade = launchTarget.isArcade;

    if (effectiveGamePath && !fs.existsSync(effectiveGamePath)) {
      reject(new Error(`Game file not found at: ${effectiveGamePath}`));
      return;
    }

    const emulatorName = path.basename(emulatorPath).toLowerCase();
    const { spawn } = require('child_process');

    const spawnArgs = [];
    const launchConfig = config || {};

    if (emulatorName.includes('xenia') && !isArcade) {
      const titleId = launchConfig.titleId || launchConfig.xeniaTitleId || null;
      try {
        const profileResult = applyXeniaProfile(
          emulatorPath,
          app.getPath('documents'),
          launchConfig,
          titleId
        );
        if (profileResult?.languageResult?.applied) {
          console.log(
            `[launch-game] Xenia language: user_language=${profileResult.languageResult.langCode} → ${profileResult.languageResult.configPaths?.join(', ')}`
          );
        }
      } catch (err) {
        console.warn('[launch-game] Xenia profile/config patch failed:', err.message);
      }
      try {
        const profileResult = applyActiveProfileForLaunch(
          emulatorPath,
          app.getPath('documents'),
          app.getPath('userData'),
          launchConfig.xboxLiveProfileId || null
        );
        if (profileResult?.ok) {
          console.log(`[launch-game] profile ${profileResult.profileKey}`);
        } else if (profileResult?.error) {
          console.warn('[launch-game] Xbox Live profile:', profileResult.error);
        }
      } catch (err) {
        console.warn('[launch-game] Xbox Live profile config patch failed:', err.message);
      }
    } else if (isArcade) {
      console.log('[launch-game] Arcade/XBLA title — minimal launch (clearing signed-in profile from Xenia config)');
      try {
        clearXeniaProfilesForArcadeLaunch(emulatorPath, app.getPath('documents'));
      } catch (err) {
        console.warn('[launch-game] Arcade profile clear failed:', err.message);
      }
    }

    if (effectiveGamePath) {
      spawnArgs.push(effectiveGamePath);
    }

    if (launchConfig && !isArcade) {
      if (emulatorName.includes('xenia')) {
        if (isTruthy(launchConfig.fullscreen)) {
          spawnArgs.push('--fullscreen=true');
        }

        spawnArgs.push(
          ...getResolutionLaunchArgs(launchConfig.resolution, launchConfig.resolutionScale)
        );
        const gpu = String(launchConfig.renderer || 'auto').toLowerCase();
        if (gpu !== 'auto') {
          if (gpu === 'directx12' || gpu === 'd3d12') {
            spawnArgs.push('--gpu=d3d12');
          } else if (gpu === 'vulkan') {
            spawnArgs.push('--gpu=vulkan');
          } else if (gpu === 'opengl') {
            spawnArgs.push('--gpu=opengl');
          } else if (gpu === 'directx11' || gpu === 'd3d11') {
            spawnArgs.push('--gpu=d3d11');
          }
        }

        let vsyncEnabled = launchConfig.vsync;
        if (launchConfig.frameLimit === 'unlimited' || launchConfig.frameLimit === '120' || launchConfig.frameLimit === '144') {
          vsyncEnabled = false;
        }
        if (vsyncEnabled !== undefined) {
          spawnArgs.push(`--vsync=${vsyncEnabled}`);
        }

        if (launchConfig.debugMode === true || launchConfig.debugMode === 'true') {
          spawnArgs.push('--debug=true');
        }

        if (launchConfig.logLevel) {
          spawnArgs.push(`--log_level=${mapLogLevel(launchConfig.logLevel)}`);
        }

        // Add license mask for full/activated mode (Xenia Canary specific)
        spawnArgs.push('--license_mask=-1');

        // Ensure patches are actually applied by the emulator
        spawnArgs.push('--apply_patches=true');

        const langCode = resolveLaunchLanguageCode(launchConfig);
        if (langCode != null) {
          spawnArgs.push(`--user_language=${langCode}`);
        }

        const keyboardMode = resolveKeyboardMode(launchConfig);
        if (keyboardMode > 0) {
          spawnArgs.push(`--keyboard_mode=${keyboardMode}`);
          spawnArgs.push('--hid=winkey');
        }

        // Add mount cache if needed (maps to textureCache in frontend)
        if (launchConfig.textureCache || launchConfig.mountCache) {
          spawnArgs.push('--mount_cache=true');
        }

        const usesD3d12 = gpu === 'd3d12' || gpu === 'directx12';
        if (launchConfig.gpuReadback === true) {
          spawnArgs.push('--d3d12_readback_resolve=true');
        }
        if (usesD3d12) {
          spawnArgs.push('--d3d12_queue_priority=1');
        }

        if (launchConfig.customArgs) spawnArgs.push(...launchConfig.customArgs.split(' ').filter(arg => arg.trim()));
      } else {
        if (launchConfig.fullscreen) spawnArgs.push('--fullscreen');
        if (launchConfig.resolution && launchConfig.resolution !== 'auto') spawnArgs.push(`--resolution=${launchConfig.resolution}`);
        if (launchConfig.renderer && launchConfig.renderer !== 'auto') spawnArgs.push(`--renderer=${launchConfig.renderer}`);
        if (launchConfig.audioDriver && launchConfig.audioDriver !== 'auto') spawnArgs.push(`--audio=${launchConfig.audioDriver}`);
        if (launchConfig.vsync === false) spawnArgs.push('--no-vsync');
        else if (launchConfig.vsync === true) spawnArgs.push('--vsync');

        if (launchConfig.antialiasing && launchConfig.antialiasing !== 'auto') {
          spawnArgs.push(`--antialiasing=${launchConfig.antialiasing}`);
        }
        if (launchConfig.textureFiltering && launchConfig.textureFiltering !== 'auto') {
          spawnArgs.push(`--texture-filter=${launchConfig.textureFiltering}`);
        }
        if (launchConfig.frameLimit && launchConfig.frameLimit !== 'auto') {
          spawnArgs.push(`--fps-limit=${launchConfig.frameLimit}`);
        }
        if (launchConfig.audioLatency && launchConfig.audioLatency !== 'auto') {
          spawnArgs.push(`--audio-latency=${launchConfig.audioLatency}`);
        }
        if (launchConfig.customArgs) spawnArgs.push(...launchConfig.customArgs.split(' ').filter(arg => arg.trim()));
      }
    }

    const useCustomFpsOverlay = emulatorName.includes('xenia') && wantsFpsOverlay(launchConfig);

    const command = `"${emulatorPath}" ${spawnArgs.join(' ')}`;
    console.log('Launching game with command:', command);
    console.log('Spawn args:', spawnArgs);
    if (useCustomFpsOverlay) {
      console.log('[launch-game] Custom X360 Manager FPS overlay enabled.');
    }

    const child = spawn(emulatorPath, spawnArgs, {
      cwd: launchCwd,
      detached: true,
      stdio: 'ignore'
    });

    let settled = false;
    const finishLaunch = () => {
      if (settled) return;
      settled = true;
      trackEmulatorPid(child.pid);
      if (useCustomFpsOverlay) {
        startFpsSampler();
      }
      child.unref();
      resolve({ command, pid: child.pid, emulatorRunning: true });
    };

    child.on('error', (error) => {
      console.error('Launch error:', error);
      stopFpsSampler();
      if (!settled) {
        settled = true;
        reject(new Error(`Failed to launch game: ${error.message}`));
      }
    });

    child.on('exit', () => {
      untrackEmulatorPid(child.pid);
    });

    child.on('spawn', () => {
      console.log('Game launched successfully');
      finishLaunch();
    });

    setTimeout(() => {
      if (!settled && !child.killed && child.exitCode === null) {
        console.log('Game process started successfully');
        finishLaunch();
      }
    }, 3000);
  });
});

ipcMain.handle('get-emulator-session', () => ({
  running: activeEmulatorPids.size > 0,
  count: activeEmulatorPids.size
}));

ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => checkForUpdates({ silent: false }));

ipcMain.handle('download-app-update', async () => downloadUpdate());

ipcMain.handle('install-app-update', async () => installUpdate());

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('storage-get', async (event, key) => {
  try {
    return readAppStorage(app.getPath('userData'), key, null);
  } catch (err) {
    return null;
  }
});

ipcMain.handle('storage-set', async (event, key, data) => {
  try {
    return writeAppStorage(app.getPath('userData'), key, data);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('storage-get-path', async () => {
  return app.getPath('userData');
});

ipcMain.handle('cover-cache-exists', async (event, url) => {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('cover-cache://') && !url.startsWith('file:')) return true;
  try {
    const filePath = resolveLocalImagePath(url);
    return Boolean(filePath && fs.existsSync(filePath));
  } catch {
    return false;
  }
});

const getCoverCacheDir = () => path.join(app.getPath('userData'), 'cover-cache');

ipcMain.handle('get-cover-cache-stats', async () => {
  try {
    const cacheDir = getCoverCacheDir();
    if (!fs.existsSync(cacheDir)) {
      return { ok: true, path: cacheDir, fileCount: 0, bytes: 0 };
    }
    let fileCount = 0;
    let bytes = 0;
    for (const name of fs.readdirSync(cacheDir)) {
      const filePath = path.join(cacheDir, name);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          fileCount += 1;
          bytes += stat.size;
        }
      } catch {
        // skip
      }
    }
    return { ok: true, path: cacheDir, fileCount, bytes };
  } catch (err) {
    return { ok: false, error: err.message, fileCount: 0, bytes: 0 };
  }
});

ipcMain.handle('clear-cover-cache', async () => {
  try {
    const cacheDir = getCoverCacheDir();
    if (!fs.existsSync(cacheDir)) {
      return { ok: true, path: cacheDir, deleted: 0, bytesFreed: 0 };
    }
    let deleted = 0;
    let bytesFreed = 0;
    for (const name of fs.readdirSync(cacheDir)) {
      const filePath = path.join(cacheDir, name);
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;
        bytesFreed += stat.size;
        fs.unlinkSync(filePath);
        deleted += 1;
      } catch (err) {
        console.warn('[cover-cache] Could not delete:', filePath, err.message);
      }
    }
    return { ok: true, path: cacheDir, deleted, bytesFreed };
  } catch (err) {
    return { ok: false, error: err.message, deleted: 0, bytesFreed: 0 };
  }
});

ipcMain.handle('set-fullscreen', async (event, enabled) => setAppFullscreen(enabled));

ipcMain.handle('focus-main-window', () => {
  focusMainWindow();
  return true;
});

ipcMain.handle('is-fullscreen', () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isFullScreen() : false;
});

ipcMain.handle('toggle-fullscreen', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  return setAppFullscreen(!mainWindow.isFullScreen());
});

ipcMain.handle('get-app-icon-url', () => {
  const iconPath = resolveAppIconPath();
  if (!iconPath) return null;
  return pathToFileURL(iconPath).href;
});

ipcMain.handle('apply-xenia-ui-settings', async (event, emulatorPath, config) => {
  if (!emulatorPath || !fs.existsSync(emulatorPath)) {
    return { ok: false, error: 'Emulator path not found' };
  }
  try {
    const result = applyXeniaUiSettings(emulatorPath, app.getPath('documents'), config || {});
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('apply-xenia-profile', async (event, emulatorPath, profileSettings, titleId) => {
  if (!emulatorPath || !fs.existsSync(emulatorPath)) {
    return { ok: false, error: 'Emulator path not found' };
  }
  try {
    const result = applyXeniaProfile(
      emulatorPath,
      app.getPath('documents'),
      profileSettings || {},
      titleId || null,
      { patchGlobal: true }
    );
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('export-xenia-profile-toml', async (event, profileSettings) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Xenia Profile',
      defaultPath: 'x360-xenia-profile.toml',
      filters: [{ name: 'TOML Config', extensions: ['toml'] }]
    });
    if (canceled || !filePath) return { ok: false, cancelled: true };
    fs.writeFileSync(filePath, buildProfileToml(profileSettings || {}), 'utf8');
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('open-xenia-config-folder', async (event, emulatorPath) => {
  if (!emulatorPath || !fs.existsSync(emulatorPath)) {
    return { ok: false, error: 'Emulator path not found' };
  }
  const configDir = path.join(path.dirname(emulatorPath), 'config');
  fs.mkdirSync(configDir, { recursive: true });
  await shell.openPath(configDir);
  return { ok: true, path: configDir };
});

ipcMain.handle('list-xbox-live-profiles', async (event, emulatorPath) => {
  try {
    return listXboxLiveProfiles(emulatorPath, app.getPath('documents'), app.getPath('userData'));
  } catch (err) {
    return { ok: false, error: err.message, profiles: [] };
  }
});

ipcMain.handle('save-xbox-live-profile', async (event, emulatorPath, profile, setActive) => {
  if (!emulatorPath || !fs.existsSync(emulatorPath)) {
    return { ok: false, error: 'Emulator path not found' };
  }
  try {
    return saveXboxLiveProfile(
      emulatorPath,
      app.getPath('documents'),
      app.getPath('userData'),
      profile,
      Boolean(setActive)
    );
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('create-xbox-live-profile', async (event, emulatorPath, options) => {
  if (!emulatorPath || !fs.existsSync(emulatorPath)) {
    return { ok: false, error: 'Emulator path not found' };
  }
  try {
    return createProfile(emulatorPath, app.getPath('documents'), app.getPath('userData'), options || {});
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('verify-xbox-live-profile-pin', async (event, emulatorPath, profileKey, pin) => {
  try {
    return verifyProfilePin(app.getPath('userData'), profileKey, pin);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('import-xbox-live-profile', async (event, emulatorPath, sourcePath) => {
  if (!emulatorPath || !fs.existsSync(emulatorPath)) {
    return { ok: false, error: 'Emulator path not found' };
  }
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, error: 'Profile file not found' };
  }
  try {
    return importProfileFile(emulatorPath, app.getPath('documents'), app.getPath('userData'), sourcePath);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('delete-xbox-live-profile', async (event, emulatorPath, profileKey) => {
  if (!emulatorPath || !fs.existsSync(emulatorPath)) {
    return { ok: false, error: 'Emulator path not found' };
  }
  try {
    return deleteProfile(emulatorPath, app.getPath('documents'), app.getPath('userData'), profileKey);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('export-xbox-live-profile', async (event, sourcePath) => {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, error: 'Profile file not found' };
  }
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Xbox Live Profile',
      defaultPath: path.basename(sourcePath),
      filters: [{ name: 'Xbox Profile', extensions: ['*'] }]
    });
    if (canceled || !filePath) return { ok: false, cancelled: true };
    return exportProfileFile(sourcePath, filePath);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('open-xbox-live-profile-folder', async (event, emulatorPath) => {
  if (!emulatorPath || !fs.existsSync(emulatorPath)) {
    return { ok: false, error: 'Emulator path not found' };
  }
  try {
    const contentRoot = resolveXContentRoot(emulatorPath, app.getPath('documents'));
    const dir = getProfileStorageDir(contentRoot);
    fs.mkdirSync(dir, { recursive: true });
    await shell.openPath(dir);
    return { ok: true, path: dir };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('select-xbox-live-profile-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Xbox Live Profile',
    filters: [{ name: 'Xbox Profile (E000…)', extensions: ['*'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('validate-cover-url', async (event, url, options = {}) => {
  const lenient = options?.lenient === true;
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('data:')) return true;
  if (url.startsWith('file:')) {
    try {
      const localPath = url.replace(/^file:\/+/i, '');
      return fs.existsSync(localPath);
    } catch {
      return false;
    }
  }

  let normalized = url.startsWith('//') ? `https:${url}` : url;
  let hostname = '';
  try {
    hostname = new URL(normalized).hostname.toLowerCase();
    if (hostname.includes('download.xbox.com')) {
      normalized = toXboxCdnHttpUrl(normalized);
      hostname = 'download.xbox.com';
    } else if (normalized.startsWith('http://')) {
      normalized = normalized.replace(/^http:\/\//i, 'https://');
      hostname = new URL(normalized).hostname.toLowerCase();
    }
  } catch {
    return false;
  }

  const trustedHost =
    hostname.includes('download.xbox.com') ||
    hostname.includes('xbox.com') ||
    hostname.includes('screenscraper.fr') ||
    hostname.includes('steamstatic.com');

  if (lenient && trustedHost) return true;

  const checkUrl = (targetUrl, method = 'HEAD') =>
    new Promise((resolve) => {
      try {
        const parsed = new URL(targetUrl);
        const lib = parsed.protocol === 'https:' ? require('https') : require('http');
        const req = lib.request(
          {
            method,
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: `${parsed.pathname}${parsed.search}`,
            headers: {
              'User-Agent': 'X360-Manager/1.5.0',
              Accept: 'image/*,*/*;q=0.8'
            },
            timeout: lenient ? 5000 : 8000
          },
          (res) => {
            const status = res.statusCode || 0;
            const contentType = (res.headers['content-type'] || '').toLowerCase();
            const contentLength = parseInt(res.headers['content-length'] || '0', 10);
            res.resume();
            if (status < 200 || status >= 400) return resolve(false);
            if (!lenient) {
              if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
                return resolve(false);
              }
              if (contentLength && contentLength < 512) return resolve(false);
            }
            resolve(true);
          }
        );
        req.on('timeout', () => {
          req.destroy();
          resolve(lenient && trustedHost);
        });
        req.on('error', () => resolve(lenient && trustedHost));
        req.end();
      } catch {
        resolve(lenient && trustedHost);
      }
    });

  if (await checkUrl(normalized, 'HEAD')) return true;
  if (lenient && trustedHost) return true;
  return checkUrl(normalized, 'GET');
});

ipcMain.handle('cache-cover-image', async (event, url) => {
  if (!url || typeof url !== 'string') return null;

  let fetchUrl = url;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host.includes('download.xbox.com')) {
      return null;
    }
    fetchUrl = toXboxCdnHttpUrl(url);
  } catch {
    return null;
  }

  try {
    const cacheDir = path.join(app.getPath('userData'), 'cover-cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const hash = crypto.createHash('md5').update(fetchUrl).digest('hex');
    let ext = '.jpg';
    try {
      ext = path.extname(new URL(fetchUrl).pathname) || '.jpg';
    } catch {
      ext = '.jpg';
    }
    const cachePath = path.join(cacheDir, `${hash}${ext}`);

    if (fs.existsSync(cachePath)) {
      const stat = fs.statSync(cachePath);
      if (stat.size > 1024) {
        return toLocalFileUrl(cachePath);
      }
      fs.unlinkSync(cachePath);
    }

    await downloadCoverToFile(fetchUrl, cachePath);
    if (!fs.existsSync(cachePath) || fs.statSync(cachePath).size < 512) {
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      return toXboxCdnHttpUrl(fetchUrl);
    }

    return toLocalFileUrl(cachePath);
  } catch (err) {
    console.warn('[CoverCache] Failed to cache cover:', fetchUrl, err.message);
    return toXboxCdnHttpUrl(fetchUrl);
  }
});

ipcMain.handle('screenscraper-search', async (event, { gameName, limit = 8 }) => {
  if (!gameName) return [];
  const baseAuth = getScreenScraperAuthQuery();
  if (!baseAuth) {
    console.warn('[ScreenScraper] Missing credentials — copy .env.example to .env');
    return [];
  }
  try {
    const searchUrl = `https://www.screenscraper.fr/api2/jeuRecherche.php?recherche=${encodeURIComponent(gameName)}${baseAuth}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const jeux = searchData?.reponse?.jeux || [];
    if (!jeux.length) return [];

    const baseInfoUrl = `https://www.screenscraper.fr/api2/jeuInfos.php?dummy=1${baseAuth}`;
    const fetchInfo = async (jeu) => {
      try {
        const infoRes = await fetch(`${baseInfoUrl}&gameid=${jeu.id}`);
        if (!infoRes.ok) return null;
        const infoData = await infoRes.json();
        const j = infoData?.reponse?.jeu;
        if (!j) return null;
        const medias = (j.medias || []).map((m) => {
          if (!m?.url) return m;
          let u = m.url.trim();
          if (u.startsWith('//')) u = `https:${u}`;
          else if (u.startsWith('/')) u = `https://www.screenscraper.fr${u}`;
          else if (u.startsWith('http://')) u = u.replace(/^http:\/\//i, 'https://');
          return { ...m, url: u };
        });
        const boxPreferences = [
          (m) => m.type === 'box-2D' && m.parent === 'Principale',
          (m) => m.type === 'box-2D' && (m.region === 'us' || m.region === 'wor'),
          (m) => m.type === 'box-2D',
          (m) => m.type === 'box-3D',
          (m) => typeof m.type === 'string' && m.type.includes('box')
        ];
        let cover = null;
        for (const pred of boxPreferences) {
          const m = medias.find(pred);
          if (m?.url) {
            cover = m.url;
            break;
          }
        }
        if (!cover) return null;
        return {
          source: 'screenscraper',
          title: j.noms?.[0]?.nom || jeu.nom,
          coverUrl: cover,
          description: j.synopsis?.find((s) => s.langue === 'en')?.texte || j.synopsis?.[0]?.texte || null,
          genre: j.genres?.[0]?.noms?.find((n) => n.langue === 'en')?.text || j.genres?.[0]?.nom || null
        };
      } catch {
        return null;
      }
    };

    const top = jeux.slice(0, Math.min(limit, 6));
    const results = await Promise.all(top.map(fetchInfo));
    return results.filter(Boolean);
  } catch (err) {
    console.error('[ScreenScraper Search] exception', err);
    return [];
  }
});

// Create a desktop shortcut for a game
ipcMain.handle('create-desktop-shortcut', async (event, gameName, emulatorPath, gamePath) => {
  try {
    const { execSync } = require('child_process');
    const path = require('path');
    const os = require('os');

    // Create shortcut on User's Desktop
    const desktopPath = path.join(os.homedir(), 'Desktop');
    // Sanitize game name to make a safe filename
    const safeName = gameName.replace(/[<>:"/\\|?*]+/g, '').trim();
    const shortcutPath = path.join(desktopPath, `${safeName}.lnk`);

    // Use a temporary ps1 file to avoid complex nested quoting issues with cmd.exe
    const fs = require('fs');
    const ps1Path = path.join(os.tmpdir(), `create_shortcut_${Date.now()}.ps1`);
    const psScript = `
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath}")
$Shortcut.TargetPath = "${emulatorPath}"
$Shortcut.Arguments = """${gamePath}"""
$Shortcut.WorkingDirectory = "${path.dirname(emulatorPath)}"
$Shortcut.Save()
    `;
    fs.writeFileSync(ps1Path, psScript);
    execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${ps1Path}"`);
    fs.unlinkSync(ps1Path);

    return { success: true, path: shortcutPath };
  } catch (error) {
    console.error('Failed to create shortcut:', error);
    return { success: false, error: error.message };
  }
});

// Fetch and install Xbox 360 game patches
ipcMain.handle('download-patches', async (event, emulatorPath) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const https = require('https');
    const AdmZip = require('adm-zip');

    if (!emulatorPath || !fs.existsSync(emulatorPath)) {
      throw new Error('Emulator path is invalid or missing.');
    }

    const emuDir = path.dirname(emulatorPath);
    const patchesDir = path.join(emuDir, 'patches');

    // Create patches dir if it doesn't exist
    if (!fs.existsSync(patchesDir)) {
      fs.mkdirSync(patchesDir, { recursive: true });
    }

    const zipPath = path.join(emuDir, 'patches.zip');
    const downloadUrl = 'https://github.com/xenia-canary/game-patches/archive/refs/heads/main.zip';

    // Download the zip
    await new Promise((resolve, reject) => {
      https.get(downloadUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // Handle redirect
          https.get(res.headers.location, (redirectRes) => {
            const file = fs.createWriteStream(zipPath);
            redirectRes.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
            file.on('error', reject);
          }).on('error', reject);
        } else {
          const file = fs.createWriteStream(zipPath);
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
          file.on('error', reject);
        }
      }).on('error', reject);
    });

    // Extract the zip
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    // The zip contains a folder like 'game-patches-main/patches/', we only want its contents.
    let extractedCount = 0;
    zipEntries.forEach(entry => {
      if (entry.entryName.startsWith('game-patches-main/patches/') && !entry.isDirectory) {
        const content = zip.readFile(entry);
        const fileName = path.basename(entry.entryName);
        fs.writeFileSync(path.join(patchesDir, fileName), content);
        extractedCount += 1;
      }
    });

    // Cleanup zip
    fs.unlinkSync(zipPath);

    return { success: true, count: extractedCount };
  } catch (error) {
    console.error('Failed to download patches:', error);
    return { success: false, error: error.message };
  }
});

// Open patches folder in File Explorer
ipcMain.handle('open-patches-folder', async (event, emulatorPath) => {
  try {
    const path = require('path');
    const fs = require('fs');
    if (!emulatorPath) return;
    const patchesDir = path.join(path.dirname(emulatorPath), 'patches');
    if (fs.existsSync(patchesDir)) {
      shell.openPath(patchesDir);
    } else {
      shell.openPath(path.dirname(emulatorPath));
    }
  } catch (error) {
    console.error(error);
  }
});

// Install a game patch manually from disk
ipcMain.handle('install-game-patch', async (event, { emulatorPath, titleId }) => {
  try {
    if (!emulatorPath || !titleId) return { success: false, error: 'Missing emulator path or title id' };

    const { dialog } = require('electron');
    const fs = require('fs');
    const path = require('path');

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Patch File to Install',
      filters: [
        { name: 'Patch Files', extensions: ['toml', 'patch', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const sourceFile = result.filePaths[0];
      const patchesDir = path.join(path.dirname(emulatorPath), 'patches');

      // Ensure patches directory exists
      if (!fs.existsSync(patchesDir)) {
        fs.mkdirSync(patchesDir, { recursive: true });
      }

      // If the selected file is already in the patches directory, no need to copy
      const sourceDir = path.dirname(path.resolve(sourceFile));
      const resolvedPatchesDir = path.resolve(patchesDir);
      if (sourceDir.toLowerCase() === resolvedPatchesDir.toLowerCase()) {
        console.log('Patch file is already in the patches directory:', sourceFile);
        return { success: true, path: sourceFile };
      }

      // Copy the patch file into the patches directory, keeping the original name
      const sourceFileName = path.basename(sourceFile);
      const destFile = path.join(patchesDir, sourceFileName);

      fs.copyFileSync(sourceFile, destFile);
      return { success: true, path: destFile };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error('Failed to install game patch manually:', error);
    return { success: false, error: error.message };
  }
});

// Get patches for a specific game (Title ID)
ipcMain.handle('get-game-patches', async (event, { emulatorPath, titleId, gamePath }) => {
  try {
    if (!emulatorPath) return { success: false, error: 'Missing emulator path' };

    let effectiveTitleId = titleId;
    if (!effectiveTitleId && gamePath) {
      effectiveTitleId = extractTitleId(gamePath);
    }

    if (!effectiveTitleId) return { success: false, error: 'Missing or could not detect title id' };

    const patchPath = findPatchFileForTitle(emulatorPath, effectiveTitleId);
    if (!patchPath) {
      return { success: false, error: `No patch file found for title ID ${effectiveTitleId}` };
    }

    const { patches } = parsePatchFile(patchPath);

    return {
      success: true,
      patchFile: patchPath,
      patches: patches.map((p) => ({ ...p })),
      detectedTitleId: effectiveTitleId
    };
  } catch (error) {
    console.error('Failed to get game patches:', error);
    return { success: false, error: error.message };
  }
});

// Get all patch files in directory
ipcMain.handle('get-all-patch-files', async (event, emulatorPath) => {
  try {
    const fs = require('fs');
    const path = require('path');
    if (!emulatorPath) return { success: false, files: [] };

    const patchesDir = path.join(path.dirname(emulatorPath), 'patches');
    if (!fs.existsSync(patchesDir)) return { success: true, files: [] };

    const patchFilenames = fs.readdirSync(patchesDir)
      .filter(f => f.endsWith('.toml') || f.endsWith('.patch'));

    const files = [];
    for (const f of patchFilenames) {
      let titleName = "Unknown Game";
      try {
        const fullPath = path.join(patchesDir, f);
        const fd = fs.openSync(fullPath, 'r');
        const buffer = Buffer.alloc(1024);
        fs.readSync(fd, buffer, 0, 1024, 0);
        fs.closeSync(fd);

        const content = buffer.toString('utf8');
        const match = content.match(/title_name\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
        if (match) {
          titleName = match[1] || match[2];
        }
      } catch (e) {
      }
      files.push({ filename: f.toUpperCase(), titleName: titleName.trim() });
    }

    files.sort((a, b) => a.titleName.localeCompare(b.titleName));

    return { success: true, files };
  } catch (error) {
    console.error('Failed to get all patch files:', error);
    return { success: false, files: [] };
  }
});

// Delete a patch file
ipcMain.handle('delete-patch-file', async (event, patchFilePath) => {
  try {
    const fs = require('fs');
    if (fs.existsSync(patchFilePath)) {
      fs.unlinkSync(patchFilePath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    console.error('Failed to delete patch file:', error);
    return { success: false, error: error.message };
  }
});

// Toggle a specific patch
ipcMain.handle('toggle-game-patch', async (event, { patchFile, enabledLineIndex, newValue, patchId }) => {
  try {
    if (!patchFile) return { success: false, error: 'Patch file not found' };

    if (patchId !== undefined && patchId !== null) {
      return togglePatchEnabled(patchFile, patchId, Boolean(newValue));
    }

    const { lines, patches } = parsePatchFile(patchFile);
    const patch = patches.find((p) => p.enabledLineIndex === enabledLineIndex) || patches[0];
    if (!patch) {
      return { success: false, error: 'Patch entry not found in file' };
    }
    return togglePatchEnabled(patchFile, patch.id, Boolean(newValue));
  } catch (error) {
    console.error('Failed to toggle game patch:', error);
    return { success: false, error: error.message };
  }
});

// File validation handlers
ipcMain.handle('validate-emulator', async (event, emulatorPath) => {
  try {
    if (!fs.existsSync(emulatorPath)) {
      return { valid: false, error: 'Emulator file not found' };
    }

    const stats = fs.statSync(emulatorPath);
    if (!stats.isFile()) {
      return { valid: false, error: 'Path is not a file' };
    }

    if (path.extname(emulatorPath).toLowerCase() !== '.exe') {
      return { valid: false, error: 'File is not an executable (.exe)' };
    }

    // Check if file is accessible
    try {
      fs.accessSync(emulatorPath, fs.constants.R_OK | fs.constants.X_OK);
    } catch (err) {
      return { valid: false, error: 'File is not readable or executable' };
    }

    return {
      valid: true,
      info: {
        size: stats.size,
        modified: stats.mtime,
        path: emulatorPath
      }
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
});

const extractTitleId = (filePath) => {
  try {
    const fs = require('fs');
    const path = require('path');

    // First check if Title ID is in the filename (common for Xbox 360 games)
    // Matches 8 character hex strings like 4D5307E6
    const fileName = path.basename(filePath);
    const titleIdMatch = fileName.match(/\b([A-F0-9]{8})\b/i);
    if (titleIdMatch) {
      return titleIdMatch[1].toUpperCase();
    }

    const stats = fs.statSync(filePath);
    if (stats.size < 0x400) return null; // Too small for headers

    const fd = fs.openSync(filePath, 'r');
    const bufferSize = Math.min(stats.size, 16384); // 16KB buffer
    const buffer = Buffer.alloc(bufferSize);
    fs.readSync(fd, buffer, 0, bufferSize, 0);
    fs.closeSync(fd);

    const magic = buffer.toString('ascii', 0, 4);

    // STFS (Live, PIRS, CON) - Used by XBLA games and DLC
    if (magic === 'CON ' || magic === 'LIVE' || magic === 'PIRS') {
      return buffer.toString('hex', 0x360, 0x364).toUpperCase();
    }

    // XEX (Xbox Executable)
    if (magic === 'XEX2') {
      const numOptionalHeaders = buffer.readUInt32BE(0x14);
      for (let i = 0; i < numOptionalHeaders; i++) {
        const headerId = buffer.readUInt32BE(0x18 + i * 8);
        const headerValue = buffer.readUInt32BE(0x18 + i * 8 + 4);

        if (headerId === 0x00040006) { // Execution Info
          // The Execution Info struct contains Title ID at offset 0x0C (12 bytes)
          // If headerValue is within our buffer range
          if (headerValue < bufferSize - 16) {
            return buffer.toString('hex', headerValue + 12, headerValue + 16).toUpperCase();
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to extract Title ID from file:', filePath, e.message);
  }
  return null;
};

ipcMain.handle('validate-game-file', async (event, gamePath) => {
  try {
    if (!fs.existsSync(gamePath)) {
      return { valid: false, error: 'Game file not found' };
    }

    const stats = fs.statSync(gamePath);
    if (!stats.isFile()) {
      return { valid: false, error: 'Path is not a file' };
    }

    const ext = path.extname(gamePath).toLowerCase();
    const supportedFormats = ['.iso', '.cue', '.nrg', '.mdf', '.ccd', '.xex', '.xbe', '.xcp', '.zip', '.7z', '.rom'];

    // Allow extensionless files (often XBLA games) or matching extension
    if (ext && !supportedFormats.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported file format. Supported: ${supportedFormats.join(', ')} or extensionless XBLA games.`
      };
    }

    // Check if file is accessible
    try {
      fs.accessSync(gamePath, fs.constants.R_OK);
    } catch (err) {
      return { valid: false, error: 'File is not readable' };
    }

    // Extract Title ID for patch support
    const titleId = extractTitleId(gamePath);
    const isArcade = detectArcadeGame(gamePath);

    return {
      valid: true,
      info: {
        size: stats.size,
        format: ext,
        modified: stats.mtime,
        path: gamePath,
        titleId: titleId,
        isArcade
      }
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
});

ipcMain.handle('test-emulator-launch', async (event, emulatorPath) => {
  return new Promise((resolve) => {
    // Test launch emulator without game to see if it starts
    const testCommand = `"${emulatorPath}" --help`;

    exec(testCommand, {
      timeout: 10000,
      cwd: path.dirname(emulatorPath)
    }, (error, stdout, stderr) => {
      if (error) {
        // Try launching without --help flag
        const basicCommand = `"${emulatorPath}"`;
        exec(basicCommand, {
          timeout: 5000,
          cwd: path.dirname(emulatorPath)
        }, (error2, stdout2, stderr2) => {
          resolve({
            canLaunch: !error2,
            error: error2 ? error2.message : null,
            output: stdout2 || stderr2 || 'No output'
          });
        });
      } else {
        resolve({
          canLaunch: true,
          error: null,
          output: stdout || 'Emulator responded to --help'
        });
      }
    });
  });
});

// Add game to Steam with custom artwork
ipcMain.handle('add-to-steam', async (event, gameParams) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const https = require('https');
    const sse = require('steam-shortcut-editor');
    const crc32 = require('crc-32');

    // Try to ensure Steam is not running, as it will overwrite shortcuts.vdf on exit
    try {
      const { execSync } = require('child_process');
      const tasklist = execSync('tasklist /FI "IMAGENAME eq steam.exe"').toString();
      if (tasklist.toLowerCase().includes('steam.exe')) {
        return { success: false, error: 'Steam is currently running! Please completely exit Steam down in your System Tray before adding games.' };
      }
    } catch (e) {
      // Ignore if tasklist fails on some weird systems
    }

    const { gameName, emulatorPath, gamePath, coverUrl } = gameParams;

    // Default Steam locations
    const steamPaths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam'
    ];

    let steamDir = steamPaths.find(p => fs.existsSync(p));

    // Try registry if not found
    if (!steamDir && os.platform() === 'win32') {
      try {
        const { execSync } = require('child_process');
        const regOut = execSync('reg query HKCU\\Software\\Valve\\Steam /v SteamPath').toString();
        const match = regOut.match(/SteamPath\s+REG_SZ\s+(.+)/i);
        if (match && match[1]) {
          const regPath = path.resolve(match[1].trim());
          if (fs.existsSync(regPath)) {
            steamDir = regPath;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (!steamDir) {
      throw new Error('Steam installation not found.');
    }

    const userdataDir = path.join(steamDir, 'userdata');
    if (!fs.existsSync(userdataDir)) {
      throw new Error('Steam userdata directory not found. Please log into Steam at least once.');
    }

    const targetExe = `"${emulatorPath}"`;
    const startDir = `"${path.dirname(emulatorPath)}"`;

    // Calculate Steam AppId for grid images
    const inputString = targetExe + gameName;
    const crc = crc32.str(inputString);
    const top32 = (crc | 0x80000000) >>> 0;
    const appId64 = (BigInt(top32) << 32n) | BigInt(0x02000000);
    const gridIdStr = appId64.toString();
    const vdfAppId = top32 | 0; // Forced 32-bit signed int for the VDF property

    const newShortcut = {
      appid: vdfAppId,
      AppName: gameName,
      Exe: targetExe,
      StartDir: startDir,
      LaunchOptions: `"${gamePath}"`,
      icon: "",
      ShortcutPath: "",
      IsHidden: 0,
      AllowDesktopConfig: 1,
      AllowOverlay: 1,
      OpenVR: 0,
      Devkit: 0,
      DevkitGameID: "",
      LastPlayTime: 0,
      tags: {}
    };

    let modifiedCount = 0;

    // Loop through all users
    const users = fs.readdirSync(userdataDir);
    for (const user of users) {
      // Ignore random files like anonymous
      if (!/^\\d+$/.test(user) && !/^\d+$/.test(user)) continue;


      const userConfigDir = path.join(userdataDir, user, 'config');
      if (!fs.existsSync(userConfigDir)) {
        fs.mkdirSync(userConfigDir, { recursive: true });
      }

      const shortcutsFile = path.join(userConfigDir, 'shortcuts.vdf');
      let shortcutsData = { shortcuts: [] };

      if (fs.existsSync(shortcutsFile)) {
        try {
          shortcutsData = await new Promise((resolve, reject) => {
            sse.parseFile(shortcutsFile, (err, obj) => {
              if (err) resolve({ shortcuts: [] });
              else resolve(obj || { shortcuts: [] });
            });
          });
        } catch (e) {
          shortcutsData = { shortcuts: [] };
        }
      }

      if (!shortcutsData.shortcuts) {
        shortcutsData.shortcuts = [];
      }

      const gridDir = path.join(userConfigDir, 'grid');
      if (!fs.existsSync(gridDir)) {
        fs.mkdirSync(gridDir, { recursive: true });
      }

      const coverPath = path.join(gridDir, `${gridIdStr}p.png`); // 600x900 modern library poster
      const heroPath = path.join(gridDir, `${gridIdStr}_hero.png`); // Library banner
      const logoPath = path.join(gridDir, `${gridIdStr}_logo.png`); // Logo
      const iconPath = path.join(gridDir, `${gridIdStr}_icon.png`); // Icon

      const userShortcut = { ...newShortcut };
      if (coverUrl) {
        userShortcut.icon = iconPath;
      } else {
        userShortcut.icon = emulatorPath; // Fallback to emulator icon
      }

      // Check if it already exists
      const existingIndex = shortcutsData.shortcuts.findIndex(s => s.AppName === gameName && s.Exe === targetExe);
      if (existingIndex > -1) {
        shortcutsData.shortcuts[existingIndex] = { ...shortcutsData.shortcuts[existingIndex], ...userShortcut };
      } else {
        shortcutsData.shortcuts.push(userShortcut);
      }

      // Write back VDF
      await new Promise((resolve, reject) => {
        sse.writeFile(shortcutsFile, shortcutsData, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Handle Cover Art
      if (coverUrl) {
        const downloadImage = (url, dest) => {
          return new Promise((resolve, reject) => {
            const https = require('https');
            const fs = require('fs');

            https.get(url, (res) => {
              if (res.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${res.statusCode}`));
                return;
              }
              const file = fs.createWriteStream(dest);
              res.pipe(file);
              file.on('finish', () => {
                file.close();
                resolve();
              });
            }).on('error', (err) => {
              reject(err);
            });
          });
        };

        try {
          // If url starts with http/https
          if (coverUrl.startsWith('http')) {
            console.log(`Downloading artwork for Steam: ${coverUrl}`);
            await downloadImage(coverUrl, coverPath);
            await downloadImage(coverUrl, heroPath);
            await downloadImage(coverUrl, logoPath);
            await downloadImage(coverUrl, iconPath);
          } else if (fs.existsSync(coverUrl.replace('file:///', ''))) {
            // Handle local file protocol path
            const realPath = coverUrl.replace('file:///', '');
            fs.copyFileSync(realPath, coverPath);
            fs.copyFileSync(realPath, heroPath);
            fs.copyFileSync(realPath, logoPath);
            fs.copyFileSync(realPath, iconPath);
          }
        } catch (imgErr) {
          console.error('Failed to download custom grid for Steam:', imgErr);
        }
      }

      modifiedCount++;
    }

    if (modifiedCount === 0) {
      throw new Error('No valid Steam user configuration folders found.');
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to add to Steam:', error);
    return { success: false, error: String(error) };
  }
});
const fetchScreenScraperJeu = async (gameName, titleId) => {
  const baseAuth = getScreenScraperAuthQuery();
  if (!baseAuth) return null;

  const cleanedName = String(gameName || '').replace(/\.[^/.]+$/, '').trim();
  const baseInfoUrl = `https://www.screenscraper.fr/api2/jeuInfos.php?dummy=1${baseAuth}`;
  let data = null;

  if (titleId) {
    for (const param of ['serialnum', 'serial']) {
      if (data) break;
      const res = await fetch(`${baseInfoUrl}&${param}=${encodeURIComponent(titleId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.reponse?.jeu) data = json;
      }
    }
  }

  if (!data) {
    for (const param of ['romnom', 'romname']) {
      if (data) break;
      const res = await fetch(`${baseInfoUrl}&${param}=${encodeURIComponent(gameName)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.reponse?.jeu) data = json;
      }
    }
  }

  if (!data && cleanedName) {
    const searchUrl = `https://www.screenscraper.fr/api2/jeuRecherche.php?recherche=${encodeURIComponent(cleanedName)}${baseAuth}`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.reponse?.jeux?.length > 0) {
        const matchId = searchData.reponse.jeux[0].id;
        const infoRes = await fetch(`${baseInfoUrl}&gameid=${matchId}`);
        if (infoRes.ok) data = await infoRes.json();
      }
    }
  }

  return data?.reponse?.jeu || null;
};

ipcMain.handle('get-game-supported-languages', async (event, { gameName, titleId, gamePath } = {}) => {
  try {
    const fromTitle = normalizeLanguageCodes(
      inferLanguagesFromTitle(gameName)
        .concat(inferLanguagesFromTitle(gamePath ? path.basename(gamePath) : null))
    );
    const fromPath = normalizeLanguageCodes(inferLanguagesFromPath(gamePath));

    let fromScraper = [];
    let synopsisCount = 0;

    const jeu = await fetchScreenScraperJeu(gameName, titleId);
    if (jeu) {
      const ss = languagesFromScreenScraperJeu(jeu);
      fromScraper = ss.codes;
      synopsisCount = ss.synopsisCount;
    }

    const languages = normalizeLanguageCodes([...fromScraper, ...fromPath, ...fromTitle]);
    const { source, confidence } = resolveLanguageSourceMeta({
      fromScraper,
      synopsisCount,
      fromPath,
      fromTitle,
      fromDb: []
    });

    return {
      ok: true,
      languages,
      source,
      confidence,
      screenScraperAvailable: Boolean(getScreenScraperAuthQuery())
    };
  } catch (err) {
    return { ok: false, error: err.message, languages: [], confidence: 'low' };
  }
});

ipcMain.handle('scrape-screenscraper', async (event, { gameName, titleId }) => {
  if (!getScreenScraperAuthQuery()) {
    console.warn('[ScreenScraper] Missing credentials — copy .env.example to .env');
    return null;
  }

  try {
    console.log(`[ScreenScraper] Scraping: "${gameName}" TitleID: ${titleId || 'None'}`);
    const jeu = await fetchScreenScraperJeu(gameName, titleId);
    const data = jeu ? { reponse: { jeu } } : null;

    if (data?.reponse?.jeu) {
      console.log(`[ScreenScraper] Found: ${data.reponse.jeu.noms?.[0]?.nom}`);
      const medias = data.reponse.jeu.medias || [];
      data.reponse.jeu.medias = medias.map((media) => {
        if (!media?.url) return media;
        let mediaUrl = media.url.trim();
        if (mediaUrl.startsWith('//')) mediaUrl = `https:${mediaUrl}`;
        else if (mediaUrl.startsWith('/')) mediaUrl = `https://www.screenscraper.fr${mediaUrl}`;
        else if (mediaUrl.startsWith('http://')) mediaUrl = mediaUrl.replace(/^http:\/\//i, 'https://');
        return { ...media, url: mediaUrl };
      });
    } else {
      console.log(`[ScreenScraper] Failed to find: ${gameName}`);
    }

    return data;
  } catch (err) {
    console.error('[ScreenScraper] API Exception:', err);
    return null;
  }
});

