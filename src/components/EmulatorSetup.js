import React, { useState, useEffect, useContext } from 'react';
import {
  Download,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Zap,
  HardDrive,
  Monitor,
  Volume2
} from 'lucide-react';
import { SettingsContext } from '../context/SettingsContext';
import { GameContext } from '../context/GameContext';

const EmulatorSetup = ({ onNavigate }) => {
  const { settings, updateSettings } = useContext(SettingsContext);
  const { scanGamesDirectory, updateGame } = useContext(GameContext);
  const xbox360DBRef = React.useRef([]);
  const [setupStep, setSetupStep] = useState(1);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [emulatorPath, setEmulatorPath] = useState(settings.emulatorPath || '');
  const [gamesDirectory, setGamesDirectory] = useState(settings.gamesDirectory || '');

  const emulatorVersions = [
    {
      name: 'Xenia Stable Release',
      description: 'Latest stable release with proven compatibility',
      size: '~50 MB',
      url: 'https://github.com/xenia-project/release-builds-windows/releases/latest/download/xenia_master.zip',
      recommended: true,
      configPath: 'Documents\\Xenia\\xenia.config.toml'
    },
    {
      name: 'Xenia Canary (Development)',
      description: 'Latest development build with newest features (may be unstable)',
      size: '~55 MB',
      url: 'https://github.com/xenia-canary/xenia-canary-releases/releases/latest/download/xenia_canary_windows.zip',
      recommended: false,
      configPath: 'Same directory as xenia.exe (portable)',
      requiresRedirectHandling: true
    },
    {
      name: 'Xenia Netplay Build',
      description: 'Special build with netplay capabilities for multiplayer',
      size: '~53 MB',
      url: 'https://github.com/xenia-project/release-builds-windows/releases/latest/download/xenia_master.zip',
      recommended: false,
      configPath: 'Documents\\Xenia\\xenia.config.toml',
      requiresRedirectHandling: true
    }
  ];

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onDownloadProgress((progress) => {
        setDownloadProgress(progress);
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeDownloadProgressListener();
      }
    };
  }, []);

  const handleDownload = async (version) => {
    console.log('Download button clicked for:', version.name);

    if (!window.electronAPI) {
      console.error('Electron API not available');
      setDownloadStatus('Electron API not available - please restart the application');
      return;
    }

    console.log('Starting download process...');
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus(`Downloading ${version.name}...`);

    try {
      // Ask user where to save the emulator
      const downloadDir = await window.electronAPI.selectDirectory();
      if (!downloadDir) {
        setIsDownloading(false);
        return;
      }

      setDownloadStatus(`Downloading ${version.name}...`);

      // Download, extract, and get the xenia.exe path
      const result = await window.electronAPI.downloadEmulator(version.url, downloadDir);

      if (result && result.success && result.path) {
        console.log('Download & extract complete! Xenia at:', result.path);
        setDownloadStatus('Download complete! Emulator ready.');
        setDownloadProgress(100);

        // Auto-set emulator path
        setEmulatorPath(result.path);

        // Auto-save to settings
        updateSettings({
          emulatorPath: result.path,
          setupCompleted: true
        });

        window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'Download Complete',
          message: `${version.name} has been downloaded and configured!\n\nPath: ${result.path}\n\nThe emulator is ready to use.`,
          buttons: ['OK']
        });

        // Auto-advance to step 2
        setTimeout(() => {
          setSetupStep(2);
          setIsDownloading(false);
        }, 1500);
      } else {
        const errorMsg = result?.error || 'Unknown error during extraction';
        setDownloadStatus(`Setup failed: ${errorMsg}`);
        setIsDownloading(false);

        window.electronAPI?.showMessageBox({
          type: 'error',
          title: 'Setup Failed',
          message: `Download succeeded but extraction failed:\n\n${errorMsg}`,
          buttons: ['OK']
        });
      }
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus(`Download failed: ${error.message}`);
      setIsDownloading(false);

      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Download Failed',
        message: `Download failed: ${error.message}\n\nPlease check your internet connection and try again.`,
        buttons: ['OK']
      });
    }
  };

  const handleSelectEmulator = async () => {
    console.log('Select emulator button clicked');

    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    try {
      console.log('Opening emulator selection dialog...');
      const path = await window.electronAPI.selectEmulatorPath();
      console.log('Selected emulator path:', path);

      if (path) {
        console.log('Validating emulator...');
        // Validate the selected emulator
        const validation = await window.electronAPI.validateEmulator(path);
        console.log('Validation result:', validation);

        if (validation.valid) {
          setEmulatorPath(path);
          console.log('Emulator path set successfully');

          // Test if emulator can launch
          console.log('Testing emulator launch...');
          const testResult = await window.electronAPI.testEmulatorLaunch(path);
          console.log('Test result:', testResult);

          if (testResult.canLaunch) {
            window.electronAPI.showMessageBox({
              type: 'info',
              title: 'Emulator Validated',
              message: `Emulator validated successfully!\n\nFile: ${path}\nSize: ${(validation.info.size / 1024 / 1024).toFixed(1)} MB\nStatus: Ready to use`,
              buttons: ['OK']
            });
          } else {
            window.electronAPI.showMessageBox({
              type: 'warning',
              title: 'Emulator Warning',
              message: `Emulator file is valid but may have issues launching:\n\n${testResult.error || 'Unknown issue'}\n\nYou can still proceed, but the emulator might not work properly.`,
              buttons: ['OK']
            });
          }
        } else {
          console.error('Emulator validation failed:', validation.error);
          window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Invalid Emulator',
            message: `The selected file is not a valid emulator:\n\n${validation.error}\n\nPlease select a valid Xenia emulator executable (.exe file).`,
            buttons: ['OK']
          });
        }
      } else {
        console.log('No emulator path selected');
      }
    } catch (error) {
      console.error('Error in emulator selection:', error);
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Selection Error',
        message: `Error selecting emulator: ${error.message}`,
        buttons: ['OK']
      });
    }
  };

  const handleSelectGamesDirectory = async () => {
    if (!window.electronAPI) return;

    const path = await window.electronAPI.selectDirectory();
    if (path) {
      setGamesDirectory(path);
    }
  };

  // Load Xbox 360 DB for cover syncing
  useEffect(() => {
    fetch('https://xenia-manager.github.io/x360db/games.json')
      .then(r => r.json())
      .then(data => { xbox360DBRef.current = data; })
      .catch(() => { });
  }, []);

  const findCoverInDB = (gameName) => {
    if (!xbox360DBRef.current.length) return null;
    const cleaned = gameName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    let match = xbox360DBRef.current.find(g => g.title.toLowerCase() === cleaned);
    if (!match) match = xbox360DBRef.current.find(g => {
      const t = g.title.toLowerCase();
      return t.length >= 4 && t.includes(cleaned);
    });
    if (!match) {
      const words = cleaned.split(' ').filter(w => w.length > 2);
      if (words.length >= 1) {
        let best = null, bestScore = 0;
        for (const g of xbox360DBRef.current) {
          const t = g.title.toLowerCase();
          const score = words.filter(w => t.includes(w)).length / words.length;
          if (score > bestScore && score >= 0.75) { bestScore = score; best = g; }
        }
        match = best;
      }
    }
    return match?.boxart || null;
  };

  const handleSaveConfiguration = async () => {
    updateSettings({
      emulatorPath,
      gamesDirectory,
      setupCompleted: true
    });

    // If games directory is set, scan it and auto-sync covers
    if (gamesDirectory) {
      try {
        const newGames = await scanGamesDirectory(gamesDirectory);
        const count = newGames ? newGames.length : 0;

        // Auto-sync covers for found games
        if (newGames && newGames.length > 0) {
          for (const game of newGames) {
            const coverUrl = findCoverInDB(game.name);
            if (coverUrl) {
              updateGame(game.id, { coverUrl, genre: 'Xbox 360' });
            }
            await new Promise(r => setTimeout(r, 50));
          }
        }

        window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'Setup Complete',
          message: `Emulator configured!\n\nFound ${count} games in your directory.\nCovers have been synced automatically.`,
          buttons: ['OK']
        });
      } catch (error) {
        console.error('Scan error:', error);
        window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'Setup Complete',
          message: 'Emulator configured! You can add games from the Game Library.',
          buttons: ['OK']
        });
      }
    } else {
      window.electronAPI?.showMessageBox({
        type: 'info',
        title: 'Setup Complete',
        message: 'Xenia emulator has been configured successfully!',
        buttons: ['OK']
      });
    }

    onNavigate('library');
  };

  const renderStep1 = () => (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Download size={24} />
            Download Xenia Emulator
          </h3>
          <div className="card-subtitle">
            Choose a version to download and install
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: '16px' }}>
          {emulatorVersions.map((version, index) => (
            <div key={index} className="card" style={{
              border: version.recommended ? '2px solid #8b5cf6' : '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ color: '#e2e8f0', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {version.name}
                    {version.recommended && (
                      <span className="status status-success">Recommended</span>
                    )}
                  </h4>
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
                    {version.description}
                  </p>
                  <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
                    Size: {version.size}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>
                    Config: {version.configPath}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => handleDownload(version)}
                  disabled={isDownloading}
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>

        {isDownloading && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#e2e8f0' }}>{downloadStatus}</span>
              <span style={{ color: '#8b5cf6' }}>{Math.round(downloadProgress)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-2" style={{ gap: '16px', marginTop: '24px' }}>
          <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ExternalLink size={16} color="#3b82f6" />
              <span style={{ color: '#3b82f6', fontWeight: '600' }}>Official Xenia Downloads</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px', flex: 1 }}>
              Download directly from the official Xenia website or configure an existing installation.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: 'auto' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => window.electronAPI?.openExternal('https://xenia.jp/download/')}
              >
                <ExternalLink size={16} />
                Official Site
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => setSetupStep(2)}
              >
                Configure Existing
              </button>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Settings size={16} color="#f59e0b" />
              <span style={{ color: '#f59e0b', fontWeight: '600' }}>Configuration Info</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '14px', flex: 1 }}>
              <p style={{ marginBottom: '8px' }}>• <strong>Xenia Stable:</strong> Config at Documents\Xenia\xenia.config.toml</p>
              <p style={{ marginBottom: '8px' }}>• <strong>Xenia Canary:</strong> Config alongside xenia.exe (portable)</p>
              <p>• <strong>Per-game configs:</strong> Create TitleID.config.toml in config folder</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Settings size={24} />
            Configure Emulator
          </h3>
          <div className="card-subtitle">
            Set up emulator path and games directory
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <Zap size={16} style={{ marginRight: '8px' }} />
            Emulator Executable Path
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              className="form-input"
              value={emulatorPath}
              onChange={(e) => setEmulatorPath(e.target.value)}
              placeholder="Select xenia.exe file..."
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-secondary"
              onClick={handleSelectEmulator}
            >
              <FolderOpen size={16} />
              Browse
            </button>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
            Path to the main Xenia emulator executable (xenia.exe)
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <HardDrive size={16} style={{ marginRight: '8px' }} />
            Games Directory
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              className="form-input"
              value={gamesDirectory}
              onChange={(e) => setGamesDirectory(e.target.value)}
              placeholder="Select games folder..."
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-secondary"
              onClick={handleSelectGamesDirectory}
            >
              <FolderOpen size={16} />
              Browse
            </button>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
            Directory where your game files are stored
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setSetupStep(1)}
          >
            Back
          </button>
          <button
            className="btn btn-success"
            onClick={handleSaveConfiguration}
            disabled={!emulatorPath}
            style={{ flex: 1 }}
          >
            <CheckCircle size={16} />
            Complete Setup
          </button>
        </div>
      </div>

      {/* Configuration Preview */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Monitor size={24} />
            Configuration Preview
          </h3>
        </div>

        <div className="grid grid-2">
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
              Emulator Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {emulatorPath ? (
                <>
                  <CheckCircle size={16} color="#10b981" />
                  <span style={{ color: '#10b981' }}>Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} color="#f59e0b" />
                  <span style={{ color: '#f59e0b' }}>Not Configured</span>
                </>
              )}
            </div>
          </div>

          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
              Games Directory
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {gamesDirectory ? (
                <>
                  <CheckCircle size={16} color="#10b981" />
                  <span style={{ color: '#10b981' }}>Set</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} color="#f59e0b" />
                  <span style={{ color: '#f59e0b' }}>Not Set</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Emulator Setup
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>
          Download and configure Xenia emulator for optimal gaming experience
        </p>
      </div>

      {/* Progress Steps */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: setupStep >= 1 ? '#8b5cf6' : '#64748b'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: setupStep >= 1 ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'rgba(100, 116, 139, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              1
            </div>
            <span>Download</span>
          </div>

          <div style={{ flex: 1, height: '2px', background: setupStep >= 2 ? '#8b5cf6' : 'rgba(100, 116, 139, 0.3)' }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: setupStep >= 2 ? '#8b5cf6' : '#64748b'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: setupStep >= 2 ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'rgba(100, 116, 139, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              2
            </div>
            <span>Configure</span>
          </div>
        </div>
      </div>

      {setupStep === 1 ? renderStep1() : renderStep2()}
    </div>
  );
};

export default EmulatorSetup;