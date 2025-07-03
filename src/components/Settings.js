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
  ExternalLink
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
            Display Settings
          </h3>
          <div className="card-subtitle">
            Default display configuration for new games
          </div>
        </div>
        
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Frame Rate Limit</label>
            <select 
              className="form-select"
              value={localSettings.defaultFrameLimit || 'auto'}
              onChange={(e) => handleSettingChange('defaultFrameLimit', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="30">30 FPS</option>
              <option value="60">60 FPS</option>
              <option value="120">120 FPS</option>
              <option value="144">144 FPS</option>
              <option value="unlimited">Unlimited</option>
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
            <label className="form-label">CPU Threads</label>
            <select 
              className="form-select"
              value={localSettings.defaultCpuThreads || 'auto'}
              onChange={(e) => handleSettingChange('defaultCpuThreads', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="1">1 Thread</option>
              <option value="2">2 Threads</option>
              <option value="4">4 Threads</option>
              <option value="6">6 Threads</option>
              <option value="8">8 Threads</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Memory Limit</label>
            <select 
              className="form-select"
              value={localSettings.defaultMemoryLimit || 'auto'}
              onChange={(e) => handleSettingChange('defaultMemoryLimit', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="2gb">2 GB</option>
              <option value="4gb">4 GB</option>
              <option value="6gb">6 GB</option>
              <option value="8gb">8 GB</option>
              <option value="12gb">12 GB</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultGpuAcceleration || true}
                onChange={(e) => handleSettingChange('defaultGpuAcceleration', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Enable GPU acceleration
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultAsyncShaderCompilation || true}
                onChange={(e) => handleSettingChange('defaultAsyncShaderCompilation', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Async shader compilation
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultTextureCache || true}
                onChange={(e) => handleSettingChange('defaultTextureCache', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Enable texture cache
            </label>
          </div>
        </div>
      </div>

      {/* Compatibility Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Shield size={24} />
            Compatibility Settings
          </h3>
        </div>
        
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Compatibility Mode</label>
            <select 
              className="form-select"
              value={localSettings.defaultCompatibilityMode || 'auto'}
              onChange={(e) => handleSettingChange('defaultCompatibilityMode', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="strict">Strict</option>
              <option value="relaxed">Relaxed</option>
              <option value="legacy">Legacy</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Kernel Version</label>
            <select 
              className="form-select"
              value={localSettings.defaultKernelVersion || 'auto'}
              onChange={(e) => handleSettingChange('defaultKernelVersion', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="2.0.17150.0">2.0.17150.0</option>
              <option value="2.0.17349.0">2.0.17349.0</option>
              <option value="2.0.17559.0">2.0.17559.0</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Region Lock</label>
            <select 
              className="form-select"
              value={localSettings.defaultRegionLock || 'auto'}
              onChange={(e) => handleSettingChange('defaultRegionLock', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="ntsc">NTSC</option>
              <option value="pal">PAL</option>
              <option value="japan">Japan</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Language Override</label>
            <select 
              className="form-select"
              value={localSettings.defaultLanguageOverride || 'auto'}
              onChange={(e) => handleSettingChange('defaultLanguageOverride', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="english">English</option>
              <option value="japanese">Japanese</option>
              <option value="german">German</option>
              <option value="french">French</option>
              <option value="spanish">Spanish</option>
              <option value="italian">Italian</option>
            </select>
          </div>
        </div>
      </div>

      {/* Input Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Gamepad2 size={24} />
            Input Settings
          </h3>
        </div>
        
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Controller Profile</label>
            <select 
              className="form-select"
              value={localSettings.defaultControllerProfile || 'default'}
              onChange={(e) => handleSettingChange('defaultControllerProfile', e.target.value)}
            >
              <option value="default">Default</option>
              <option value="xbox360">Xbox 360</option>
              <option value="xboxone">Xbox One</option>
              <option value="ps4">PlayStation 4</option>
              <option value="ps5">PlayStation 5</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Analog Deadzone</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={localSettings.defaultDeadzone || 10}
              onChange={(e) => handleSettingChange('defaultDeadzone', parseInt(e.target.value))}
              className="form-input"
            />
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              {localSettings.defaultDeadzone || 10}%
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultVibration || true}
                onChange={(e) => handleSettingChange('defaultVibration', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Enable controller vibration
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultKeyboardMouseSupport || false}
                onChange={(e) => handleSettingChange('defaultKeyboardMouseSupport', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Keyboard & mouse support
            </label>
          </div>
        </div>
      </div>

      {/* Audio Enhancement Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Volume2 size={24} />
            Audio Enhancement
          </h3>
        </div>
        
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Audio Channels</label>
            <select 
              className="form-select"
              value={localSettings.defaultAudioChannels || 'auto'}
              onChange={(e) => handleSettingChange('defaultAudioChannels', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="stereo">Stereo (2.0)</option>
              <option value="surround">Surround (5.1)</option>
              <option value="surround71">Surround (7.1)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Sample Rate</label>
            <select 
              className="form-select"
              value={localSettings.defaultSampleRate || 'auto'}
              onChange={(e) => handleSettingChange('defaultSampleRate', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="44100">44.1 kHz</option>
              <option value="48000">48 kHz</option>
              <option value="96000">96 kHz</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Game Volume</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={localSettings.defaultGameVolume || 100}
              onChange={(e) => handleSettingChange('defaultGameVolume', parseInt(e.target.value))}
              className="form-input"
            />
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              {localSettings.defaultGameVolume || 100}%
            </div>
          </div>
        </div>
      </div>

      {/* Debug Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Info size={24} />
            Debug Settings
          </h3>
        </div>
        
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultDebugMode || false}
                onChange={(e) => handleSettingChange('defaultDebugMode', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Enable debug mode
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">Log Level</label>
            <select 
              className="form-select"
              value={localSettings.defaultLogLevel || 'info'}
              onChange={(e) => handleSettingChange('defaultLogLevel', e.target.value)}
            >
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
              <option value="verbose">Verbose</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultShowFps || false}
                onChange={(e) => handleSettingChange('defaultShowFps', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show FPS counter
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={localSettings.defaultShowStats || false}
                onChange={(e) => handleSettingChange('defaultShowStats', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show performance stats
            </label>
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
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>Version 1.0.0</p>
          
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