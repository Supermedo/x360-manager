import React, { useState, useContext } from 'react';
import { 
  Settings as SettingsIcon, 
  Monitor, 
  Volume2, 
  Gamepad2, 
  Download,
  Palette,
  Shield,
  HardDrive,
  Cpu,
  RotateCcw,
  Save,
  FolderOpen,
  Search,
  Zap,
  Globe,
  Info,
  ExternalLink,
  Package,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { SettingsContext } from '../context/SettingsContext';
import { GameContext } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';

const Settings = () => {
  const { settings, updateSettings, resetSettings } = useContext(SettingsContext);
  const { scanGamesDirectory } = useContext(GameContext);
  const { t } = useTranslation();
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  const handleSettingChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = () => {
    updateSettings(localSettings);
    setHasUnsavedChanges(false);
    
    window.electronAPI?.showMessageBox({
      type: 'info',
      title: 'Settings Saved',
      message: 'Your settings have been saved successfully!',
      buttons: ['OK']
    });
  };

  const handleResetSettings = () => {
    window.electronAPI?.showMessageBox({
      type: 'question',
      title: 'Reset Settings',
      message: 'Are you sure you want to reset all settings to their default values?',
      buttons: ['Cancel', 'Reset']
    }).then((result) => {
      if (result.response === 1) {
        resetSettings();
        setLocalSettings({
          emulatorPath: '',
          gamesDirectory: '',
          defaultResolution: 'auto',
          defaultRenderer: 'auto',
          defaultAudioDriver: 'auto',
          defaultFullscreen: false,
          autoSaveStates: true,
          checkUpdates: true,
          theme: 'dark',
          language: 'en'
        });
        setHasUnsavedChanges(true);
      }
    });
  };

  const handleFactoryReset = () => {
    window.electronAPI?.showMessageBox({
      type: 'warning',
      title: 'Factory Reset - Fresh Start',
      message: 'This will permanently delete ALL data including:\n\n• All games in your library\n• All settings and configurations\n• All API keys and preferences\n• All save game backups\n• All custom emulator settings\n\nThis action cannot be undone. Are you absolutely sure?',
      buttons: ['Cancel', 'Yes, Reset Everything'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 1) {
        // Show final confirmation
        window.electronAPI?.showMessageBox({
          type: 'error',
          title: 'Final Confirmation',
          message: 'Last chance! This will erase EVERYTHING and restart the app as if it was just installed.\n\nProceed with factory reset?',
          buttons: ['Cancel', 'Yes, Erase Everything'],
          defaultId: 0
        }).then((finalResult) => {
          if (finalResult.response === 1) {
            // Clear all localStorage data
            localStorage.clear();
            
            // Clear all API keys
            setRawgApiKey('');
            setIgdbApiKey('');
            setIgdbAccessToken('');
            
            // Reset all settings to defaults
            resetSettings();
            setLocalSettings({
              emulatorPath: '',
              gamesDirectory: '',
              defaultResolution: 'auto',
              defaultRenderer: 'auto',
              defaultAudioDriver: 'auto',
              defaultFullscreen: false,
              autoSaveStates: true,
              checkUpdates: true,
              theme: 'dark',
              language: 'en'
            });
            
            // Clear games from context (if available)
            if (window.electronAPI?.clearAllData) {
              window.electronAPI.clearAllData();
            }
            
            // Show success message and reload
            window.electronAPI?.showMessageBox({
              type: 'info',
              title: 'Factory Reset Complete',
              message: 'All data has been cleared. The application will now restart with fresh settings.',
              buttons: ['OK']
            }).then(() => {
              // Reload the application
              window.location.reload();
            });
          }
        });
      }
    });
  };

  const handleSelectEmulatorPath = async () => {
    if (!window.electronAPI) return;
    
    const path = await window.electronAPI.selectEmulatorPath();
    if (path) {
      handleSettingChange('emulatorPath', path);
    }
  };

  const handleSelectGamesDirectory = async () => {
    try {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        handleSettingChange('gamesDirectory', path);
        
        // Always scan for games when directory is selected
        const shouldScan = await window.electronAPI.showMessageBox({
          type: 'question',
          title: 'Scan for Games',
          message: 'Would you like to automatically scan this directory for games and add them to your library?',
          buttons: ['Yes', 'No'],
          defaultId: 0
        });
        
        if (shouldScan.response === 0) {
          await handleScanGames(path);
        }
      }
    } catch (error) {
      console.error('Error selecting games directory:', error);
    }
  };

  const handleScanGames = async (directory = localSettings.gamesDirectory) => {
    if (!directory) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: 'No Directory Selected',
        message: 'Please select a games directory first.'
      });
      return;
    }

    setIsScanning(true);
    try {
      const newGames = await scanGamesDirectory(directory);
      
      await window.electronAPI.showMessageBox({
        type: 'info',
        title: 'Scan Complete',
        message: `Found ${newGames.length} new games in the directory.`
      });
    } catch (error) {
      console.error('Error scanning games:', error);
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Scan Failed',
        message: `Failed to scan games directory: ${error.message}`
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateStatus(null);
    
    try {
      // Check GitHub API for latest release with proper headers
      const response = await fetch('https://api.github.com/repos/mohammedalbarthouthi/X360-Manager/releases/latest', {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'X360-Manager-App'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.tag_name) {
        throw new Error('Invalid response from GitHub API');
      }
      
      const currentVersion = '1.1.0';
      const latestVersion = data.tag_name.replace(/^v/, '');
      
      if (latestVersion !== currentVersion) {
        setUpdateStatus({
          type: 'warning',
          message: `New version ${latestVersion} is available! Current version: ${currentVersion}. Click "View Releases" to download.`
        });
      } else {
        setUpdateStatus({
          type: 'success',
          message: 'You are running the latest version!'
        });
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      
      let errorMessage = 'Unable to check for updates. ';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage += 'Please check your internet connection and try again.';
      } else if (error.message.includes('CORS')) {
        errorMessage += 'Browser security restrictions prevent automatic update checking. Please visit the GitHub releases page manually.';
      } else if (error.message.includes('403')) {
        errorMessage += 'GitHub API rate limit reached. Please try again later.';
      } else if (error.message.includes('404')) {
        errorMessage += 'Repository not found. Please check the GitHub repository manually.';
      } else {
        errorMessage += 'An unexpected error occurred. Please visit the GitHub releases page manually.';
      }
      
      setUpdateStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'emulator', label: 'Emulator', icon: Zap },
    { id: 'gamedefaults', label: 'Game Defaults', icon: Gamepad2 },
    { id: 'graphics', label: 'Graphics', icon: Monitor },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'interface', label: 'Interface', icon: Palette },
    { id: 'services', label: 'API Services', icon: Globe },
    { id: 'advanced', label: 'Advanced', icon: Shield }
  ];

  const renderGeneralTab = () => (
    <div className="grid" style={{ gap: '24px' }}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <HardDrive size={24} />
            File Paths
          </h3>
        </div>
        
        <div className="form-group">
          <label className="form-label">Emulator Executable</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              className="form-input" 
              value={localSettings.emulatorPath || ''}
              onChange={(e) => handleSettingChange('emulatorPath', e.target.value)}
              placeholder="Path to xenia.exe..."
              style={{ flex: 1 }}
            />
            <button 
              className="btn btn-secondary"
              onClick={handleSelectEmulatorPath}
            >
              <FolderOpen size={16} />
              Browse
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Games Directory</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              className="form-input" 
              value={localSettings.gamesDirectory || ''}
              onChange={(e) => handleSettingChange('gamesDirectory', e.target.value)}
              placeholder="Default games folder..."
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
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.autoDetectGames || false}
              onChange={(e) => handleSettingChange('autoDetectGames', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Automatically detect games when selecting directory
          </label>
        </div>
        
        <div className="form-group">
          <button 
            className="btn btn-primary"
            onClick={() => handleScanGames()}
            disabled={!localSettings.gamesDirectory || isScanning}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Search size={16} />
            {isScanning ? 'Scanning...' : 'Scan Games Directory'}
          </button>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ color: '#ef4444' }}>
            <AlertTriangle size={24} />
            Danger Zone
          </h3>
          <div className="card-subtitle" style={{ color: '#fca5a5' }}>
            Irreversible actions that will permanently delete your data
          </div>
        </div>
        
        <div style={{ 
          padding: '20px', 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Trash2 size={20} color="#ef4444" />
            <h4 style={{ color: '#ef4444', margin: 0, fontSize: '16px' }}>Factory Reset (Fresh Start)</h4>
          </div>
          
          <p style={{ color: '#fca5a5', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
            This will completely reset X360 Manager to its initial state, as if you just installed it for the first time. 
            All your games, settings, configurations, and data will be permanently deleted.
          </p>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>What will be deleted:</p>
            <ul style={{ color: '#fca5a5', fontSize: '12px', marginLeft: '16px', lineHeight: '1.4' }}>
              <li>All games in your library</li>
              <li>All emulator settings and configurations</li>
              <li>All API keys and service settings</li>
              <li>All custom preferences and themes</li>
              <li>All save game backups and data</li>
              <li>All file paths and directory settings</li>
            </ul>
          </div>
          
          <button 
            className="btn"
            onClick={handleFactoryReset}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            <Trash2 size={16} />
            Factory Reset - Delete Everything
          </button>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Download size={24} />
            Updates & Maintenance
          </h3>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.checkUpdates || false}
              onChange={(e) => handleSettingChange('checkUpdates', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Check for updates automatically
          </label>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.autoSaveStates || false}
              onChange={(e) => handleSettingChange('autoSaveStates', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Auto-save game states
          </label>
        </div>
        
        <div style={{ 
          padding: '16px', 
          background: 'rgba(59, 130, 246, 0.1)', 
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          marginTop: '16px'
        }}>
          <h4 style={{ color: '#3b82f6', marginBottom: '12px', fontSize: '16px' }}>Application Updates</h4>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
            Current Version: <strong>1.1.0</strong>
          </p>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
               className="btn btn-primary"
               onClick={handleCheckForUpdates}
               disabled={isCheckingUpdates}
             >
               <Download size={16} />
               {isCheckingUpdates ? 'Checking...' : 'Check for Updates'}
             </button>
             
             <button 
               className="btn btn-secondary"
               onClick={() => {
                 window.electronAPI?.openExternal('https://github.com/mohammedalbarthouthi/X360-Manager/releases');
                 setUpdateStatus({
                   type: 'success',
                   message: 'Opened releases page in your browser. Download the latest version if available.'
                 });
               }}
             >
               <ExternalLink size={16} />
               View Releases
             </button>
             
             <button 
               className="btn btn-secondary"
               onClick={() => window.electronAPI?.openExternal('https://github.com/mohammedalbarthouthi/X360-Manager')}
             >
               <ExternalLink size={16} />
               GitHub Repository
             </button>
          </div>
          
          {updateStatus && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              background: updateStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${updateStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              borderRadius: '6px',
              color: updateStatus.type === 'success' ? '#10b981' : '#f59e0b',
              fontSize: '14px'
            }}>
              {updateStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderGameDefaultsTab = () => (
    <div className="grid" style={{ gap: '24px' }}>
      {/* Display Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Monitor size={24} />
            Xenia Display Settings
          </h3>
          <div className="card-subtitle">
            Default display configuration for new games
          </div>
        </div>
        
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Resolution Scale</label>
            <select 
              className="form-select"
              value={localSettings.defaultResolutionScale || '1x'}
              onChange={(e) => handleSettingChange('defaultResolutionScale', e.target.value)}
            >
              <option value="1x">1x (Native)</option>
              <option value="2x">2x (Double)</option>
              <option value="3x">3x (Triple)</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">GPU Backend</label>
            <select 
              className="form-select"
              value={localSettings.defaultGpuBackend || 'auto'}
              onChange={(e) => handleSettingChange('defaultGpuBackend', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="vulkan">Vulkan</option>
              <option value="d3d12">Direct3D 12</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultVsync || false}
                onChange={(e) => handleSettingChange('defaultVsync', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Enable VSync by default
            </label>
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Cpu size={24} />
            Performance Settings
          </h3>
        </div>
        
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Language</label>
            <select 
              className="form-select"
              value={localSettings.defaultLanguage || 'en'}
              onChange={(e) => handleSettingChange('defaultLanguage', e.target.value)}
            >
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="it">Italian</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">License Mask</label>
            <input 
              type="text" 
              className="form-input"
              value={localSettings.defaultLicenseMask || '0xFFFFFFFF'}
              onChange={(e) => handleSettingChange('defaultLicenseMask', e.target.value)}
              placeholder="0xFFFFFFFF"
            />
          </div>
          

        </div>
      </div>

      {/* Audio Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Volume2 size={24} />
            Audio Settings
          </h3>
        </div>
        
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Audio Channels</label>
            <select 
              className="form-select"
              value={localSettings.defaultAudioChannels || '2'}
              onChange={(e) => handleSettingChange('defaultAudioChannels', e.target.value)}
            >
              <option value="2">Stereo (2.0)</option>
              <option value="6">5.1 Surround</option>
              <option value="8">7.1 Surround</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Sample Rate</label>
            <select 
              className="form-select"
              value={localSettings.defaultSampleRate || '48000'}
              onChange={(e) => handleSettingChange('defaultSampleRate', e.target.value)}
            >
              <option value="44100">44.1 kHz</option>
              <option value="48000">48 kHz</option>
              <option value="96000">96 kHz</option>
            </select>
          </div>
        </div>
      </div>

      {/* DLC and Update Management */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Package size={24} />
            DLC and Update Management
          </h3>
        </div>
        
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">DLC Directory</label>
            <input 
              type="text" 
              className="form-input"
              value={localSettings.defaultDlcDirectory || ''}
              onChange={(e) => handleSettingChange('defaultDlcDirectory', e.target.value)}
              placeholder="Path to DLC folder"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Update Directory</label>
            <input 
              type="text" 
              className="form-input"
              value={localSettings.defaultUpdateDirectory || ''}
              onChange={(e) => handleSettingChange('defaultUpdateDirectory', e.target.value)}
              placeholder="Path to updates folder"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultAutoDetectDlc || true}
                onChange={(e) => handleSettingChange('defaultAutoDetectDlc', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Auto-detect DLC
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultAutoInstallUpdates || false}
                onChange={(e) => handleSettingChange('defaultAutoInstallUpdates', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Auto-install updates
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">Install Mode</label>
            <select 
              className="form-select"
              value={localSettings.defaultInstallMode || 'prompt'}
              onChange={(e) => handleSettingChange('defaultInstallMode', e.target.value)}
            >
              <option value="prompt">Prompt before install</option>
              <option value="auto">Auto install</option>
              <option value="manual">Manual only</option>
            </select>
          </div>
        </div>
      </div>


    </div>
  );

  const renderEmulatorTab = () => (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Zap size={24} />
          Emulator Configuration
        </h3>
        <div className="card-subtitle">
          Basic emulator setup and configuration
        </div>
      </div>
      
      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Default Resolution</label>
          <select 
            className="form-select"
            value={localSettings.defaultResolution || 'auto'}
            onChange={(e) => handleSettingChange('defaultResolution', e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="1920x1080">1920x1080 (Full HD)</option>
            <option value="1280x720">1280x720 (HD)</option>
            <option value="1366x768">1366x768</option>
            <option value="2560x1440">2560x1440 (2K)</option>
            <option value="3840x2160">3840x2160 (4K)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Default Renderer</label>
          <select 
            className="form-select"
            value={localSettings.defaultRenderer || 'auto'}
            onChange={(e) => handleSettingChange('defaultRenderer', e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="opengl">OpenGL</option>
            <option value="vulkan">Vulkan</option>
            <option value="directx11">DirectX 11</option>
            <option value="directx12">DirectX 12</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Default Audio Driver</label>
          <select 
            className="form-select"
            value={localSettings.defaultAudioDriver || 'auto'}
            onChange={(e) => handleSettingChange('defaultAudioDriver', e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="wasapi">WASAPI</option>
            <option value="directsound">DirectSound</option>
            <option value="asio">ASIO</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.defaultFullscreen || false}
              onChange={(e) => handleSettingChange('defaultFullscreen', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Launch games in fullscreen by default
          </label>
        </div>
      </div>
    </div>
  );

  const renderGraphicsTab = () => (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Monitor size={24} />
          Graphics Preferences
        </h3>
      </div>
      
      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Default Anti-aliasing</label>
          <select 
            className="form-select"
            value={localSettings.defaultAntialiasing || 'auto'}
            onChange={(e) => handleSettingChange('defaultAntialiasing', e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="none">None</option>
            <option value="2x">2x MSAA</option>
            <option value="4x">4x MSAA</option>
            <option value="8x">8x MSAA</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Default Texture Filtering</label>
          <select 
            className="form-select"
            value={localSettings.defaultTextureFiltering || 'auto'}
            onChange={(e) => handleSettingChange('defaultTextureFiltering', e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="nearest">Nearest</option>
            <option value="linear">Linear</option>
            <option value="anisotropic">Anisotropic</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.defaultVsync || false}
              onChange={(e) => handleSettingChange('defaultVsync', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Enable VSync by default
          </label>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.showFPS || false}
              onChange={(e) => handleSettingChange('showFPS', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Show FPS counter
          </label>
        </div>
      </div>
    </div>
  );

  const renderAudioTab = () => (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Volume2 size={24} />
          Audio Preferences
        </h3>
      </div>
      
      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Master Volume</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={localSettings.masterVolume || 100}
            onChange={(e) => handleSettingChange('masterVolume', parseInt(e.target.value))}
            className="form-input"
          />
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            {localSettings.masterVolume || 100}%
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Default Audio Latency</label>
          <select 
            className="form-select"
            value={localSettings.defaultAudioLatency || 'auto'}
            onChange={(e) => handleSettingChange('defaultAudioLatency', e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="low">Low (32ms)</option>
            <option value="medium">Medium (64ms)</option>
            <option value="high">High (128ms)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.muteInBackground || false}
              onChange={(e) => handleSettingChange('muteInBackground', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Mute audio when window loses focus
          </label>
        </div>
      </div>
    </div>
  );

  const renderInterfaceTab = () => (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Palette size={24} />
          {t('interface')} Preferences
        </h3>
      </div>
      
      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">{t('theme')}</label>
          <select 
            className="form-select"
            value={localSettings.theme || 'dark'}
            onChange={(e) => handleSettingChange('theme', e.target.value)}
          >
            <option value="dark">{t('dark')}</option>
            <option value="light">{t('light')}</option>
            <option value="auto">{t('auto')} (System)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">{t('language')}</label>
          <select 
            className="form-select"
            value={localSettings.language || 'en'}
            onChange={(e) => handleSettingChange('language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.minimizeToTray || false}
              onChange={(e) => handleSettingChange('minimizeToTray', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Minimize to system tray
          </label>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.startMinimized || false}
              onChange={(e) => handleSettingChange('startMinimized', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Start minimized
          </label>
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="grid" style={{ gap: '24px' }}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Shield size={24} />
            Advanced Options
          </h3>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.enableLogging || false}
              onChange={(e) => handleSettingChange('enableLogging', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Enable debug logging
          </label>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              checked={localSettings.enableTelemetry || false}
              onChange={(e) => handleSettingChange('enableTelemetry', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Send anonymous usage statistics
          </label>
        </div>
        
        <div className="form-group">
          <label className="form-label">Custom Emulator Arguments</label>
          <input 
            type="text" 
            className="form-input" 
            value={localSettings.customEmulatorArgs || ''}
            onChange={(e) => handleSettingChange('customEmulatorArgs', e.target.value)}
            placeholder="Additional command line arguments..."
          />
          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
            These arguments will be added to all emulator launches
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Info size={24} />
            About
          </h3>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Zap size={32} color="white" />
          </div>
          
          <h3 style={{ color: '#e2e8f0', marginBottom: '8px' }}>X360 Manager</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>Version 1.1.0</p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => window.electronAPI?.openExternal('https://github.com/xenia-project')}
            >
              <ExternalLink size={16} />
              GitHub
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => window.electronAPI?.openExternal('https://xenia.jp')}
            >
              <ExternalLink size={16} />
              Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const [rawgApiKey, setRawgApiKey] = React.useState(localStorage.getItem('rawgApiKey') || '');
  const [igdbApiKey, setIgdbApiKey] = React.useState(localStorage.getItem('igdbApiKey') || '');
  const [igdbAccessToken, setIgdbAccessToken] = React.useState(localStorage.getItem('igdbAccessToken') || '');
  
  const handleApiKeyChange = (key, value) => {
    if (key === 'rawg') {
      setRawgApiKey(value);
      localStorage.setItem('rawgApiKey', value);
    } else if (key === 'igdb') {
      setIgdbApiKey(value);
      localStorage.setItem('igdbApiKey', value);
    } else if (key === 'igdbToken') {
      setIgdbAccessToken(value);
      localStorage.setItem('igdbAccessToken', value);
    }
  };
  
  const renderServicesTab = () => {
    
    return (
      <div className="grid" style={{ gap: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Globe size={24} />
              Game Cover Sources
            </h3>
            <div className="card-subtitle">
              Configure API keys for automatic game cover fetching
            </div>
          </div>
          
          <div style={{ 
            padding: '16px', 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <h4 style={{ color: '#10b981', marginBottom: '8px', fontSize: '16px' }}>✅ Free Sources (No API Key Required)</h4>
            <ul style={{ color: '#94a3b8', fontSize: '14px', marginLeft: '16px' }}>
              <li><strong>RAWG API</strong> - Basic game database (limited requests)</li>
              <li><strong>Steam Store API</strong> - Steam game covers and metadata</li>
            </ul>
          </div>
          
          <div className="form-group">
            <label className="form-label">RAWG API Key (Optional - Increases Rate Limits)</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="password" 
                className="form-input" 
                value={rawgApiKey}
                onChange={(e) => handleApiKeyChange('rawg', e.target.value)}
                placeholder="Enter your RAWG API key (optional)..."
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-secondary"
                onClick={() => window.electronAPI?.openExternal('https://rawg.io/apidocs')}
              >
                <ExternalLink size={16} />
                Get API Key
              </button>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
              Optional: Increases rate limits from 20,000 to 40,000 requests per month
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">IGDB Client ID (Advanced Users)</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="password" 
                className="form-input" 
                value={igdbApiKey}
                onChange={(e) => handleApiKeyChange('igdb', e.target.value)}
                placeholder="Enter your IGDB Client ID..."
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-secondary"
                onClick={() => window.electronAPI?.openExternal('https://api-docs.igdb.com/#getting-started')}
              >
                <ExternalLink size={16} />
                Get API Key
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">IGDB Access Token</label>
            <input 
              type="password" 
              className="form-input" 
              value={igdbAccessToken}
              onChange={(e) => handleApiKeyChange('igdbToken', e.target.value)}
              placeholder="Enter your IGDB Access Token..."
            />
            <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
              Required along with Client ID for IGDB API access
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Info size={24} />
              API Information
            </h3>
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ 
              padding: '16px', 
              background: 'rgba(59, 130, 246, 0.1)', 
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px'
            }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px', fontSize: '16px' }}>RAWG API</h4>
              <ul style={{ color: '#94a3b8', fontSize: '14px', marginLeft: '16px' }}>
                <li>Free tier: 20,000 requests/month</li>
                <li>With API key: 40,000 requests/month</li>
                <li>Comprehensive game database</li>
                <li>High-quality cover images</li>
              </ul>
            </div>
            
            <div style={{ 
              padding: '16px', 
              background: 'rgba(139, 92, 246, 0.1)', 
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px'
            }}>
              <h4 style={{ color: '#8b5cf6', marginBottom: '8px', fontSize: '16px' }}>Steam Store API</h4>
              <ul style={{ color: '#94a3b8', fontSize: '14px', marginLeft: '16px' }}>
                <li>Completely free, no API key required</li>
                <li>Covers for Steam games</li>
                <li>Fast and reliable</li>
                <li>Automatically used as fallback</li>
              </ul>
            </div>
            
            <div style={{ 
              padding: '16px', 
              background: 'rgba(245, 158, 11, 0.1)', 
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px'
            }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px', fontSize: '16px' }}>IGDB API (Advanced)</h4>
              <ul style={{ color: '#94a3b8', fontSize: '14px', marginLeft: '16px' }}>
                <li>Requires Twitch Developer account</li>
                <li>More complex setup process</li>
                <li>Excellent for indie/obscure games</li>
                <li>Higher quality metadata</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralTab();
      case 'emulator': return renderEmulatorTab();
      case 'gamedefaults': return renderGameDefaultsTab();
      case 'graphics': return renderGraphicsTab();
      case 'audio': return renderAudioTab();
      case 'interface': return renderInterfaceTab();
      case 'services': return renderServicesTab();
      case 'advanced': return renderAdvancedTab();
      default: return renderGeneralTab();
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Settings
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>
          Configure your emulator and application preferences
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Action Buttons */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className="btn btn-success"
            onClick={handleSaveSettings}
            disabled={!hasUnsavedChanges}
            style={{ flex: 1 }}
          >
            <Save size={16} />
            {t('save')}
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={handleResetSettings}
          >
            <RotateCcw size={16} />
            {t('reset')}
          </button>
        </div>
        
        {hasUnsavedChanges && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            color: '#f59e0b',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Info size={16} />
            You have unsaved changes. Don't forget to save your settings!
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;