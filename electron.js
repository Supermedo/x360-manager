const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

let mainWindow;

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
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  });

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
      { name: 'Game Files', extensions: ['iso', 'xex', 'xbe', 'img', 'rom', 'zip', '7z'] },
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
      { name: 'Game Files', extensions: ['iso', 'xex', 'xbe', 'img', 'rom', 'zip', '7z'] },
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

// Handle scanning directories for games
ipcMain.handle('scan-directory', async (event, directoryPath) => {
  try {
    const files = [];
    
    const scanRecursively = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively scan subdirectories
          scanRecursively(fullPath);
        } else if (stat.isFile()) {
          files.push(fullPath);
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

ipcMain.handle('download-emulator', async (event, url, downloadPath) => {
  return new Promise((resolve, reject) => {
    // Validate download directory exists
    const downloadDir = path.dirname(downloadPath);
    if (!fs.existsSync(downloadDir)) {
      try {
        fs.mkdirSync(downloadDir, { recursive: true });
      } catch (err) {
        reject(new Error(`Cannot create download directory: ${err.message}`));
        return;
      }
    }
    
    const downloadFile = (downloadUrl, attempt = 1) => {
      const file = fs.createWriteStream(downloadPath);
      
      // Parse URL to handle different protocols
      const urlModule = require('url');
      const parsedUrl = urlModule.parse(downloadUrl);
      const httpModule = parsedUrl.protocol === 'https:' ? https : require('http');
      
      const request = httpModule.get(downloadUrl, {
        headers: {
          'User-Agent': 'X365-Manager/1.0.0'
        }
      }, (response) => {
        // Handle redirects (including cross-protocol)
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location;
          if (redirectUrl && attempt <= 10) {
            request.abort();
            file.close();
            fs.unlink(downloadPath, () => {});
            
            // Handle relative redirects
            const finalRedirectUrl = redirectUrl.startsWith('http') 
              ? redirectUrl 
              : `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
            
            console.log(`Redirect ${attempt}: ${downloadUrl} -> ${finalRedirectUrl}`);
            downloadFile(finalRedirectUrl, attempt + 1);
            return;
          } else {
            file.close();
            fs.unlink(downloadPath, () => {});
            reject(new Error(`Too many redirects (${attempt}) or invalid redirect URL`));
            return;
          }
        }
        
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(downloadPath, () => {});
          reject(new Error(`Download failed with status: ${response.statusCode} - ${response.statusMessage || 'Unknown error'}`));
          return;
        }
        
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;
        
        response.pipe(file);
        
        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            event.sender.send('download-progress', progress);
          }
        });
        
        file.on('finish', () => {
          file.close();
          // Verify file was downloaded
          if (fs.existsSync(downloadPath) && fs.statSync(downloadPath).size > 0) {
            resolve(downloadPath);
          } else {
            reject(new Error('Downloaded file is empty or corrupted'));
          }
        });
        
        file.on('error', (err) => {
          fs.unlink(downloadPath, () => {});
          reject(new Error(`File write error: ${err.message}`));
        });
      });
      
      request.on('error', (err) => {
        file.close();
        fs.unlink(downloadPath, () => {});
        reject(new Error(`Network error: ${err.message}`));
      });
      
      request.setTimeout(60000, () => {
        request.abort();
        file.close();
        fs.unlink(downloadPath, () => {});
        reject(new Error('Download timeout - please check your internet connection'));
      });
    };
    
    // Start the download
    downloadFile(url);
  });
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
          if (config.renderer === 'd3d12') {
            spawnArgs.push('--gpu=d3d12');
          } else if (config.renderer === 'vulkan') {
            spawnArgs.push('--gpu=vulkan');
          }
        }
        if (config.vsync !== undefined) {
          spawnArgs.push(`--vsync=${config.vsync}`);
        }
        
        // Add FPS counter if enabled
        if (config.showFPS) {
          spawnArgs.push('--show_profiler=true');
        }
        
        // Add license mask for full/activated mode (Xenia Canary specific)
        spawnArgs.push('--license_mask=-1');
        
        // Add user language (default to English)
        if (config.userLanguage) {
          spawnArgs.push(`--user_language=${config.userLanguage}`);
        } else {
          spawnArgs.push('--user_language=1'); // Default to English
        }
        
        // Add mount cache if needed
        if (config.mountCache) {
          spawnArgs.push('--mount_cache=true');
        }
        
        // Add GPU readback if needed
        if (config.gpuReadback) {
          spawnArgs.push('--d3d12_readback_resolve=true');
        }
        
        // Add queue priority for better performance
        if (config.queuePriority) {
          spawnArgs.push(`--d3d12_queue_priority=${config.queuePriority}`);
        } else {
          spawnArgs.push('--d3d12_queue_priority=1'); // Default to High for better performance
        }
        
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
    const supportedFormats = ['.iso', '.cue', '.img', '.nrg', '.mdf', '.ccd'];
    
    if (!supportedFormats.includes(ext)) {
      return { 
        valid: false, 
        error: `Unsupported file format. Supported: ${supportedFormats.join(', ')}` 
      };
    }
    
    // Check if file is accessible
    try {
      fs.accessSync(gamePath, fs.constants.R_OK);
    } catch (err) {
      return { valid: false, error: 'File is not readable' };
    }
    
    return { 
      valid: true, 
      info: {
        size: stats.size,
        format: ext,
        modified: stats.mtime,
        path: gamePath
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