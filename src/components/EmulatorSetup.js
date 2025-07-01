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

const EmulatorSetup = ({ onNavigate }) => {
  const { settings, updateSettings } = useContext(SettingsContext);
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
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'API Error',
        message: 'Electron API is not available. Please restart the application.',
        buttons: ['OK']
      });
      return;
    }

    console.log('Starting download process...');
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus('Starting download...');

    try {
      console.log('Selecting download directory...');
      const downloadPath = await window.electronAPI.selectDirectory();
      console.log('Selected path:', downloadPath);
      
      if (!downloadPath) {
        console.log('No download path selected');
        setIsDownloading(false);
        return;
      }

      const fileName = version.url.split('/').pop();
      const fullPath = `${downloadPath}\\${fileName}`;
      console.log('Full download path:', fullPath);
      console.log('Version info:', version);

      setDownloadStatus(`Downloading ${version.name}...`);
      console.log('Starting download from:', version.url);
      
      // Add special handling for versions that require redirect handling
      if (version.requiresRedirectHandling) {
        setDownloadStatus(`Resolving download URL for ${version.name}...`);
        console.log('This version requires redirect handling');
      }
      
      await window.electronAPI.downloadEmulator(version.url, fullPath);
      
      console.log('Download completed successfully');
      setDownloadStatus('Download completed!');
      setDownloadProgress(100);
      
      window.electronAPI?.showMessageBox({
        type: 'info',
        title: 'Download Complete',
        message: `Emulator downloaded successfully to:\n${fullPath}`,
        buttons: ['OK']
      });
      
      // Auto-advance to next step
      setTimeout(() => {
        setSetupStep(2);
        setIsDownloading(false);
      }, 1500);
      
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

  const handleSaveConfiguration = () => {
    updateSettings({
      emulatorPath,
      gamesDirectory,
      setupCompleted: true
    });
    
    window.electronAPI?.showMessageBox({
      type: 'info',
      title: 'Setup Complete',
      message: 'Xenia emulator has been configured successfully!',
      buttons: ['OK']
    });
    
    onNavigate('dashboard');
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
        
        <div className="grid" style={{ gap: '16px' }}>
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
        
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ExternalLink size={16} color="#3b82f6" />
            <span style={{ color: '#3b82f6', fontWeight: '600' }}>Official Xenia Downloads</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
            Download directly from the official Xenia website or configure an existing installation.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => window.electronAPI?.openExternal('https://xenia.jp/download/')}
            >
              <ExternalLink size={16} />
              Official Site
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setSetupStep(2)}
            >
              Configure Existing
            </button>
          </div>
        </div>
        
        <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Settings size={16} color="#f59e0b" />
            <span style={{ color: '#f59e0b', fontWeight: '600' }}>Configuration Info</span>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>
            <p style={{ marginBottom: '8px' }}>• <strong>Xenia Stable:</strong> Config at Documents\Xenia\xenia.config.toml</p>
            <p style={{ marginBottom: '8px' }}>• <strong>Xenia Canary:</strong> Config alongside xenia.exe (portable)</p>
            <p>• <strong>Per-game configs:</strong> Create TitleID.config.toml in config folder</p>
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