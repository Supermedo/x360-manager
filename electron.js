const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

let mainWindow;

// Ensure application is completely portable by keeping AppData locally next to the executable
if (!isDev) {
  const portableDataPath = path.join(path.dirname(app.getPath('exe')), 'data');
  try {
    if (!fs.existsSync(portableDataPath)) {
      fs.mkdirSync(portableDataPath, { recursive: true });
    }
    app.setPath('userData', portableDataPath);
  } catch (err) {
    console.warn("Could not set portable data path", err);
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
      webSecurity: false, // Allows cross-origin requests for fetching game covers from Steam/IGDB
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f1a',
      symbolColor: '#e2e8f0',
      height: 48
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, isDev ? 'public/icon.png' : 'build/icon.png'),
    show: false
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, './build/index.html')}`
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

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

    // Validate game file exists
    if (gamePath && !fs.existsSync(gamePath)) {
      reject(new Error(`Game file not found at: ${gamePath}`));
      return;
    }

    // Determine emulator type based on filename
    const emulatorName = path.basename(emulatorPath).toLowerCase();

    // Use spawn instead of exec for better process handling
    const { spawn } = require('child_process');

    // Properly format arguments for spawn (remove quotes as spawn handles them automatically)
    const spawnArgs = [];
    if (gamePath) {
      spawnArgs.push(gamePath); // Don't quote for spawn
    }

    // Add configuration parameters without quotes
    if (config) {
      if (emulatorName.includes('xenia')) {
        // Xenia-specific arguments
        if (config.fullscreen) spawnArgs.push('--fullscreen=true');

        // Handle resolution settings
        if (config.resolution && config.resolution !== 'auto') {
          // Convert resolution string to scale factor for Xenia
          let scale = '1';
          switch (config.resolution) {
            case '1280x720':
              scale = '1'; // 720p baseline
              break;
            case '1920x1080':
              scale = '1.5'; // 1080p
              break;
            case '2560x1440':
              scale = '2'; // 1440p
              break;
            case '3840x2160':
              scale = '3'; // 4K
              break;
            default:
              scale = '1';
          }
          if (scale !== '1') {
            spawnArgs.push(`--draw_resolution_scale_x=${scale}`);
            spawnArgs.push(`--draw_resolution_scale_y=${scale}`);
          }
        }

        // Legacy support for resolutionScale
        if (config.resolutionScale && config.resolutionScale !== '1') {
          spawnArgs.push(`--draw_resolution_scale_x=${config.resolutionScale}`);
          spawnArgs.push(`--draw_resolution_scale_y=${config.resolutionScale}`);
        }
        if (config.renderer && config.renderer !== 'auto') {
          if (config.renderer === 'directx12' || config.renderer === 'd3d12') {
            spawnArgs.push('--gpu=d3d12');
          } else if (config.renderer === 'vulkan') {
            spawnArgs.push('--gpu=vulkan');
          } else if (config.renderer === 'opengl') {
            spawnArgs.push(`--gpu=opengl`);
          }
        }

        // Handle VSync and uncap FPS
        let vsyncEnabled = config.vsync;
        if (config.frameLimit === 'unlimited' || config.frameLimit === '120' || config.frameLimit === '144') {
          vsyncEnabled = false; // Disable VSync to uncap FPS limit
        }
        if (vsyncEnabled !== undefined) {
          spawnArgs.push(`--vsync=${vsyncEnabled}`);
        }

        // FPS Counter - Xenia doesn't have a reliable built-in HUD FPS counter except through Post processing in canary.
        // We will disable the heavy dev profiler mask that previously broke the FPS option.
        if (config.showFPS) {
          // Xenia displays FPS in the window title bar by default.
          // Warning: passing invalid postprocess flags will cause Xenia to crash on load.
          // Users wanting HUD FPS should use external tools like RTSS/Afterburner.
        }

        // Add license mask for full/activated mode (Xenia Canary specific)
        spawnArgs.push('--license_mask=-1');

        // Ensure patches are actually applied by the emulator
        spawnArgs.push('--apply_patches=true');

        // Handle User Language (Language Override)
        let langCode = 1; // Default to English
        const langMap = { 'en': 1, 'ja': 2, 'de': 3, 'fr': 4, 'es': 5, 'it': 6, 'ko': 7, 'zh': 8 };
        if (config.languageOverride && config.languageOverride !== 'auto' && langMap[config.languageOverride]) {
          langCode = langMap[config.languageOverride];
        } else if (config.userLanguage) {
          langCode = config.userLanguage;
        }
        spawnArgs.push(`--user_language=${langCode}`);

        // Add mount cache if needed (maps to textureCache in frontend)
        if (config.textureCache || config.mountCache) {
          spawnArgs.push('--mount_cache=true');
        }

        // Add GPU readback if needed (often matches to async issues or frontend settings)
        if (config.asyncShaderCompilation === false || config.gpuReadback) {
          spawnArgs.push('--d3d12_readback_resolve=true');
        }

        // Add queue priority for better performance
        spawnArgs.push('--d3d12_queue_priority=1'); // Default to High for better performance

        if (config.customArgs) spawnArgs.push(...config.customArgs.split(' ').filter(arg => arg.trim()));
      } else {
        // Generic emulator arguments
        if (config.fullscreen) spawnArgs.push('--fullscreen');
        if (config.resolution && config.resolution !== 'auto') spawnArgs.push(`--resolution=${config.resolution}`);
        if (config.renderer && config.renderer !== 'auto') spawnArgs.push(`--renderer=${config.renderer}`);
        if (config.audioDriver && config.audioDriver !== 'auto') spawnArgs.push(`--audio=${config.audioDriver}`);
        if (config.vsync === false) spawnArgs.push('--no-vsync');
        else if (config.vsync === true) spawnArgs.push('--vsync');

        // Additional generic settings
        if (config.antialiasing && config.antialiasing !== 'auto') {
          spawnArgs.push(`--antialiasing=${config.antialiasing}`);
        }
        if (config.textureFiltering && config.textureFiltering !== 'auto') {
          spawnArgs.push(`--texture-filter=${config.textureFiltering}`);
        }
        if (config.frameLimit && config.frameLimit !== 'auto') {
          spawnArgs.push(`--fps-limit=${config.frameLimit}`);
        }
        if (config.audioLatency && config.audioLatency !== 'auto') {
          spawnArgs.push(`--audio-latency=${config.audioLatency}`);
        }
        if (config.customArgs) spawnArgs.push(...config.customArgs.split(' ').filter(arg => arg.trim()));
      }
    }

    const command = `"${emulatorPath}" ${spawnArgs.join(' ')}`;
    console.log('Launching game with command:', command);
    console.log('Spawn args:', spawnArgs);

    const child = spawn(emulatorPath, spawnArgs, {
      cwd: path.dirname(emulatorPath),
      detached: true,
      stdio: 'ignore'
    });

    child.on('error', (error) => {
      console.error('Launch error:', error);
      reject(new Error(`Failed to launch game: ${error.message}`));
    });

    child.on('spawn', () => {
      console.log('Game launched successfully');
      child.unref(); // Allow the parent process to exit independently
      resolve({ command, pid: child.pid });
    });

    // Set a timeout for the spawn event
    setTimeout(() => {
      if (!child.killed && child.exitCode === null) {
        console.log('Game process started successfully');
        resolve({ command, pid: child.pid });
      }
    }, 3000);
  });
});

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

ipcMain.handle('get-platform', () => {
  return process.platform;
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
    zipEntries.forEach(entry => {
      if (entry.entryName.startsWith('game-patches-main/patches/') && !entry.isDirectory) {
        const content = zip.readFile(entry);
        const fileName = path.basename(entry.entryName);
        fs.writeFileSync(path.join(patchesDir, fileName), content);
      }
    });

    // Cleanup zip
    fs.unlinkSync(zipPath);

    return { success: true, count: zipEntries.length };
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
    const fs = require('fs');
    const path = require('path');
    if (!emulatorPath) return { success: false, error: 'Missing emulator path' };

    let effectiveTitleId = titleId;
    if (!effectiveTitleId && gamePath) {
      effectiveTitleId = extractTitleId(gamePath);
    }

    if (!effectiveTitleId) return { success: false, error: 'Missing or could not detect title id' };

    // Check for titleId match in file names in the patches directory
    const patchesDir = path.join(path.dirname(emulatorPath), 'patches');
    if (!fs.existsSync(patchesDir)) return { success: false, error: 'Patches folder not found. Please click Download Patches.' };

    const files = fs.readdirSync(patchesDir);
    const patchFile = files.find(f => f.toUpperCase().includes(effectiveTitleId.toUpperCase()) && (f.endsWith('.toml') || f.endsWith('.patch')));

    if (!patchFile) return { success: false, error: `No patch file found for title ID ${effectiveTitleId}` };

    const patchPath = path.join(patchesDir, patchFile);
    const lines = fs.readFileSync(patchPath, 'utf8').split(/\r?\n/);

    let patches = [];
    let currentPatch = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('[[patch]]')) {
        if (currentPatch) patches.push(currentPatch);
        currentPatch = { id: patches.length, enabledLineIndex: -1, name: 'Unnamed Patch', desc: '', author: 'Unknown', is_enabled: false };
      } else if (currentPatch && !line.startsWith('[[patch.')) { // Ignore block patches inside main patch
        if (line.startsWith('name') && line.includes('=')) {
          currentPatch.name = line.substring(line.indexOf('=') + 1).trim().replace(/(^"|"$)/g, '');
        } else if (line.startsWith('desc') && line.includes('=')) {
          currentPatch.desc = line.substring(line.indexOf('=') + 1).trim().replace(/(^"|"$)/g, '');
        } else if (line.startsWith('author') && line.includes('=')) {
          currentPatch.author = line.substring(line.indexOf('=') + 1).trim().replace(/(^"|"$)/g, '');
        } else if (line.startsWith('is_enabled') && line.includes('=')) {
          currentPatch.is_enabled = line.toLowerCase().includes('true');
          currentPatch.enabledLineIndex = i;
        }
      }
    }
    if (currentPatch) patches.push(currentPatch);

    return {
      success: true,
      patchFile: patchPath,
      patches: patches.map(p => ({ ...p })),
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
ipcMain.handle('toggle-game-patch', async (event, { patchFile, enabledLineIndex, newValue }) => {
  try {
    const fs = require('fs');
    if (!fs.existsSync(patchFile)) return { success: false, error: 'Patch file not found' };

    let content = fs.readFileSync(patchFile, 'utf8');
    const lines = content.split(/\r?\n/);

    // We'll use the enabledLineIndex as a starting point to find the actual line
    // but we'll be more flexible in case the file shifted.
    let targetIndex = enabledLineIndex;

    // If the line at the index doesn't look like is_enabled, look nearby
    if (!lines[targetIndex] || !lines[targetIndex].includes('is_enabled')) {
      // Find the [[patch]] header that this patch probably belongs to
      let patchStart = -1;
      for (let i = targetIndex; i >= 0; i--) {
        if (lines[i] && lines[i].trim().startsWith('[[patch]]')) {
          patchStart = i;
          break;
        }
      }

      if (patchStart !== -1) {
        // Look for is_enabled between this [[patch]] and the next one
        for (let i = patchStart + 1; i < lines.length; i++) {
          if (lines[i] && lines[i].trim().startsWith('[[patch]]')) break;
          if (lines[i] && lines[i].includes('is_enabled')) {
            targetIndex = i;
            break;
          }
        }
      }
    }

    if (targetIndex >= 0 && targetIndex < lines.length && lines[targetIndex].includes('is_enabled')) {
      const existingLine = lines[targetIndex];
      const leadingSpaceMatch = existingLine.match(/^\s*/);
      const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
      lines[targetIndex] = `${leadingSpace}is_enabled = ${newValue ? 'true' : 'false'}`;
      fs.writeFileSync(patchFile, lines.join('\n'), 'utf8');
      return { success: true };
    } else {
      // If we still can't find it, we might need a more complex search, 
      // but for now, we'll try to find the [[patch]] block again and append it if missing
      return { success: false, error: 'Could not find is_enabled line in patch file. Please refresh and try again.' };
    }
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

    return {
      valid: true,
      info: {
        size: stats.size,
        format: ext,
        modified: stats.mtime,
        path: gamePath,
        titleId: titleId
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
ipcMain.handle('scrape-screenscraper', async (event, { gameName, titleId }) => {
  const SS_USER = 'podpod';
  const SS_PASS = 'myJcWQIhEv3';
  const SS_DEV_ID = 'podpod';
  const SS_DEV_PASS = 'scqk4aretua';
  const SS_SOFT = 'X360 Manager';

  try {
    const cleanedName = gameName.replace(/\.[^/.]+$/, '').trim();
    console.log(`[ScreenScraper] Scraping: "${gameName}" TitleID: ${titleId || 'None'}`);

    const baseAuth = `&devid=${SS_DEV_ID}&devpassword=${SS_DEV_PASS}&softname=${encodeURIComponent(SS_SOFT)}&ssid=${SS_USER}&sspassword=${SS_PASS}&output=json&systemeid=33`;
    const baseInfoUrl = `https://www.screenscraper.fr/api2/jeuInfos.php?dummy=1${baseAuth}`;
    let data = null;

    // 1. Try search by Title ID (Serial)
    if (titleId) {
      console.log(`[ScreenScraper] Trying TitleID variants: ${titleId}`);
      // Variants: serialnum, serial
      for (const param of ['serialnum', 'serial']) {
        if (data) break;
        const res = await fetch(`${baseInfoUrl}&${param}=${encodeURIComponent(titleId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.reponse?.jeu) { data = json; console.log(`[ScreenScraper] Match found via ${param}!`); }
        }
      }
    }

    // 2. Try search by Filename (romnom)
    if (!data) {
      console.log(`[ScreenScraper] Trying Filename variants: "${gameName}"`);
      for (const param of ['romnom', 'romname']) {
        if (data) break;
        const res = await fetch(`${baseInfoUrl}&${param}=${encodeURIComponent(gameName)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.reponse?.jeu) { data = json; console.log(`[ScreenScraper] Match found via ${param}!`); }
        }
      }
    }

    // 3. Fallback: Fuzzy Search
    if (!data) {
      console.log(`[ScreenScraper] Direct match failed, trying fuzzy search for: ${cleanedName}`);
      const searchUrl = `https://www.screenscraper.fr/api2/jeuRecherche.php?recherche=${encodeURIComponent(cleanedName)}${baseAuth}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.reponse?.jeux?.length > 0) {
          const matchId = searchData.reponse.jeux[0].id;
          console.log(`[ScreenScraper] Fuzzy match: ${searchData.reponse.jeux[0].nom}`);
          const infoRes = await fetch(`${baseInfoUrl}&gameid=${matchId}`);
          if (infoRes.ok) data = await infoRes.json();
        }
      }
    }

    if (data?.reponse?.jeu) {
      console.log(`[ScreenScraper] Found: ${data.reponse.jeu.noms?.[0]?.nom}`);
    } else {
      console.log(`[ScreenScraper] Failed to find: ${gameName}`);
    }

    return data;
  } catch (err) {
    console.error('[ScreenScraper] API Exception:', err);
    return null;
  }
});

