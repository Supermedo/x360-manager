import React, { useState, useEffect, useContext } from 'react';
import { 
  Settings, 
  Monitor, 
  Volume2, 
  Gamepad2,
  Play,
  Save,
  RotateCcw,
  Info,
  ArrowLeft,
  Eye,
  Sliders
} from 'lucide-react';
import { GameContext } from '../context/GameContext';
import { SettingsContext } from '../context/SettingsContext';

const GameConfig = ({ game, onNavigate }) => {
  const { updateGame } = useContext(GameContext);
  const { settings } = useContext(SettingsContext);
  const [config, setConfig] = useState({
    resolution: 'auto',
    renderer: 'auto',
    audioDriver: 'auto',
    fullscreen: false,
    vsync: true,
    antialiasing: 'auto',
    textureFiltering: 'auto',
    frameLimit: 'auto',
    audioLatency: 'auto',
    controllerProfile: 'default',
    customArgs: '',
    // Performance Settings
    cpuThreads: 'auto',
    memoryLimit: 'auto',
    gpuAcceleration: true,
    asyncShaderCompilation: true,
    textureCache: true,
    // Compatibility Settings
    compatibilityMode: 'auto',
    kernelVersion: 'auto',
    regionLock: 'auto',
    languageOverride: 'auto',
    // Input Settings
    inputDeadzone: '0.2',
    vibrationEnabled: true,
    keyboardSupport: false,
    mouseSupport: false,
    // Audio Enhancement
    audioChannels: 'auto',
    audioSampleRate: 'auto',
    audioVolume: '100',
    // Debug Settings
    debugMode: false,
    logLevel: 'info',
    showFPS: false,
    showStats: false
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (game && game.config) {
      setConfig(prevConfig => ({ ...prevConfig, ...game.config }));
    } else {
      // Load default settings
      setConfig({
        resolution: settings.defaultResolution || 'auto',
        renderer: settings.defaultRenderer || 'auto',
        audioDriver: settings.defaultAudioDriver || 'auto',
        fullscreen: settings.defaultFullscreen || false,
        vsync: true,
        antialiasing: 'auto',
        textureFiltering: 'auto',
        frameLimit: 'auto',
        audioLatency: 'auto',
        controllerProfile: 'default',
        customArgs: ''
      });
    }
  }, [game, settings]);

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveConfig = () => {
    console.log('Save config button clicked');
    console.log('Current game:', game);
    console.log('Current config:', config);
    
    if (game) {
      try {
        updateGame(game.id, { config });
        setHasUnsavedChanges(false);
        console.log('Config saved successfully');
        
        window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'Configuration Saved',
          message: 'Game configuration has been saved successfully.',
          buttons: ['OK']
        });
      } catch (error) {
        console.error('Failed to save config:', error);
        window.electronAPI?.showMessageBox({
          type: 'error',
          title: 'Save Failed',
          message: `Failed to save configuration: ${error.message}`,
          buttons: ['OK']
        });
      }
    } else {
      console.error('No game selected for config save');
      window.electronAPI?.showMessageBox({
        type: 'warning',
        title: 'No Game Selected',
        message: 'Please select a game before saving configuration.',
        buttons: ['OK']
      });
    }
  };

  const handleResetToDefaults = () => {
    setConfig({
      resolution: 'auto',
      renderer: 'auto',
      audioDriver: 'auto',
      fullscreen: false,
      vsync: true,
      antialiasing: 'auto',
      textureFiltering: 'auto',
      frameLimit: 'auto',
      audioLatency: 'auto',
      controllerProfile: 'default',
      customArgs: '',
      // Performance Settings
      cpuThreads: 'auto',
      memoryLimit: 'auto',
      gpuAcceleration: true,
      asyncShaderCompilation: true,
      textureCache: true,
      // Compatibility Settings
      compatibilityMode: 'auto',
      kernelVersion: 'auto',
      regionLock: 'auto',
      languageOverride: 'auto',
      // Input Settings
      inputDeadzone: '0.2',
      vibrationEnabled: true,
      keyboardSupport: false,
      mouseSupport: false,
      // Audio Enhancement
      audioChannels: 'auto',
      audioSampleRate: 'auto',
      audioVolume: '100',
      // Debug Settings
      debugMode: false,
      logLevel: 'info',
      showFPS: false,
      showStats: false
    });
    setHasUnsavedChanges(true);
  };

  const handleLaunchWithConfig = async () => {
    console.log('Launch game button clicked');
    console.log('Electron API available:', !!window.electronAPI);
    console.log('Emulator path:', settings.emulatorPath);
    console.log('Game:', game);
    console.log('Config:', config);
    
    if (!window.electronAPI) {
      console.error('Electron API not available');
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Cannot Launch Game',
        message: 'Electron API is not available. Please restart the application.',
        buttons: ['OK']
      });
      return;
    }
    
    if (!settings.emulatorPath) {
      console.error('Emulator path not configured');
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Cannot Launch Game',
        message: 'Emulator path is not configured. Please go to Settings to configure the emulator.',
        buttons: ['OK']
      });
      return;
    }
    
    if (!game) {
      console.error('No game selected');
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Cannot Launch Game',
        message: 'No game is selected. Please select a game from the library.',
        buttons: ['OK']
      });
      return;
    }

    try {
      console.log('Launching game with emulator:', settings.emulatorPath);
      console.log('Game path:', game.path);
      
      await window.electronAPI.launchGame(settings.emulatorPath, game.path, config);
      
      console.log('Game launched successfully');
      
      // Save config and update game stats
      updateGame(game.id, {
        config,
        lastPlayed: new Date().toISOString(),
        timesPlayed: (game.timesPlayed || 0) + 1
      });
      
      setHasUnsavedChanges(false);
      
      window.electronAPI?.showMessageBox({
        type: 'info',
        title: 'Game Launched',
        message: 'Game has been launched successfully!',
        buttons: ['OK']
      });
      
    } catch (error) {
      console.error('Failed to launch game:', error);
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Launch Failed',
        message: `Failed to launch game: ${error.message}`,
        buttons: ['OK']
      });
    }
  };

  const resolutionOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '1920x1080', label: '1920x1080 (Full HD)' },
    { value: '1280x720', label: '1280x720 (HD)' },
    { value: '1366x768', label: '1366x768' },
    { value: '1600x900', label: '1600x900' },
    { value: '2560x1440', label: '2560x1440 (2K)' },
    { value: '3840x2160', label: '3840x2160 (4K)' }
  ];

  const rendererOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'opengl', label: 'OpenGL' },
    { value: 'vulkan', label: 'Vulkan' },
    { value: 'directx11', label: 'DirectX 11' },
    { value: 'directx12', label: 'DirectX 12' }
  ];

  const audioDriverOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'wasapi', label: 'WASAPI' },
    { value: 'directsound', label: 'DirectSound' },
    { value: 'asio', label: 'ASIO' }
  ];

  const antialiasingOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'none', label: 'None' },
    { value: '2x', label: '2x MSAA' },
    { value: '4x', label: '4x MSAA' },
    { value: '8x', label: '8x MSAA' }
  ];

  const textureFilteringOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'nearest', label: 'Nearest' },
    { value: 'linear', label: 'Linear' },
    { value: 'anisotropic', label: 'Anisotropic' }
  ];

  const frameLimitOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '30', label: '30 FPS' },
    { value: '60', label: '60 FPS' },
    { value: '120', label: '120 FPS' },
    { value: '144', label: '144 FPS' },
    { value: 'unlimited', label: 'Unlimited' }
  ];

  const audioLatencyOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'low', label: 'Low (32ms)' },
    { value: 'medium', label: 'Medium (64ms)' },
    { value: 'high', label: 'High (128ms)' }
  ];

  // Performance Options
  const cpuThreadsOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '1', label: '1 Thread' },
    { value: '2', label: '2 Threads' },
    { value: '4', label: '4 Threads' },
    { value: '6', label: '6 Threads' },
    { value: '8', label: '8 Threads' },
    { value: '12', label: '12 Threads' },
    { value: '16', label: '16 Threads' }
  ];

  const memoryLimitOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '2gb', label: '2 GB' },
    { value: '4gb', label: '4 GB' },
    { value: '6gb', label: '6 GB' },
    { value: '8gb', label: '8 GB' },
    { value: '12gb', label: '12 GB' },
    { value: '16gb', label: '16 GB' }
  ];

  // Compatibility Options
  const compatibilityModeOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'strict', label: 'Strict' },
    { value: 'relaxed', label: 'Relaxed' },
    { value: 'legacy', label: 'Legacy' }
  ];

  const kernelVersionOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '2.0.17559.0', label: '2.0.17559.0' },
    { value: '2.0.17150.0', label: '2.0.17150.0' },
    { value: '2.0.16537.0', label: '2.0.16537.0' }
  ];

  const regionLockOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'ntsc', label: 'NTSC (US/Japan)' },
    { value: 'pal', label: 'PAL (Europe)' },
    { value: 'disabled', label: 'Disabled' }
  ];

  const languageOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: 'Japanese' },
    { value: 'de', label: 'German' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' },
    { value: 'it', label: 'Italian' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' }
  ];

  // Audio Enhancement Options
  const audioChannelsOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'mono', label: 'Mono' },
    { value: 'stereo', label: 'Stereo' },
    { value: '5.1', label: '5.1 Surround' },
    { value: '7.1', label: '7.1 Surround' }
  ];

  const audioSampleRateOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '44100', label: '44.1 kHz' },
    { value: '48000', label: '48 kHz' },
    { value: '96000', label: '96 kHz' },
    { value: '192000', label: '192 kHz' }
  ];

  // Debug Options
  const logLevelOptions = [
    { value: 'error', label: 'Error Only' },
    { value: 'warning', label: 'Warning' },
    { value: 'info', label: 'Info' },
    { value: 'debug', label: 'Debug' },
    { value: 'verbose', label: 'Verbose' }
  ];

  const controllerProfileOptions = [
    { value: 'default', label: 'Default' },
    { value: 'xbox', label: 'Xbox Controller' },
    { value: 'xbox_elite', label: 'Xbox Elite Controller' },
    { value: 'playstation', label: 'PlayStation Controller' },
    { value: 'nintendo_pro', label: 'Nintendo Pro Controller' },
    { value: 'custom', label: 'Custom Profile' }
  ];

  if (!game) {
    return (
      <div className="fade-in">
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Settings size={64} style={{ color: '#64748b', marginBottom: '16px' }} />
          <h3 style={{ color: '#94a3b8', marginBottom: '8px' }}>No Game Selected</h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            Select a game from your library to configure its settings
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => onNavigate('library')}
            style={{ padding: '12px 24px', fontSize: '16px', fontWeight: '600' }}
          >
            Go to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Back Button */}
      <div style={{ marginBottom: '24px' }}>
        <button 
          className="btn btn-outline"
          onClick={() => onNavigate('library')}
          style={{ minWidth: '120px', padding: '10px 16px', fontSize: '14px' }}
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>
      
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Game Configuration
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>
          Configure settings for <strong style={{ color: '#e2e8f0' }}>{game.name}</strong>
        </p>
      </div>

      {/* Game Info */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <Info size={24} />
            Game Information
          </h3>
        </div>
        <div className="card-body">
          {/* Cover Image Preview */}
        {game.cover && (
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>Cover Image</div>
            <img 
              src={game.cover} 
              alt={`${game.name} cover`}
              style={{ 
                maxWidth: '200px', 
                maxHeight: '280px', 
                borderRadius: '8px',
                border: '2px solid rgba(139, 92, 246, 0.3)',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}
        
        <div className="grid grid-3" style={{ marginBottom: '16px' }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Name</div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>{game.name}</div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Genre</div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>{game.genre || 'Unknown'}</div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Rating</div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>
              {game.rating ? `${game.rating}/5 ⭐` : 'Not rated'}
            </div>
          </div>
        </div>
        <div className="grid grid-3" style={{ marginBottom: '16px' }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Times Played</div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>{game.timesPlayed || 0}</div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Last Played</div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>
              {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : 'Never'}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Date Added</div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>
              {game.dateAdded ? new Date(game.dateAdded).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        </div>
        
        {/* Additional Game Details */}
        <div className="grid grid-3" style={{ marginBottom: '16px' }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>File Size</div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>
              {game.fileSize ? `${(game.fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'Unknown'}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>File Type</div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>
              {game.path ? game.path.split('.').pop().toUpperCase() : 'Unknown'}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Game ID</div>
            <div style={{ color: '#e2e8f0', fontSize: '12px', fontFamily: 'monospace' }}>
              {game.id || 'N/A'}
            </div>
          </div>
        </div>
        {game.description && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Description</div>
            <div style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5' }}>{game.description}</div>
          </div>
        )}
        <div>
          <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>File Path</div>
          <div style={{ 
            color: '#e2e8f0', 
            fontSize: '12px', 
            fontFamily: 'monospace', 
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '8px', 
            borderRadius: '4px',
            wordBreak: 'break-all'
          }}>
            {game.path}
          </div>
        </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Display Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Monitor size={24} />
              Display Settings
            </h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">Resolution</label>
            <select 
              className="form-select"
              value={config.resolution}
              onChange={(e) => handleConfigChange('resolution', e.target.value)}
            >
              {resolutionOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Renderer</label>
            <select 
              className="form-select"
              value={config.renderer}
              onChange={(e) => handleConfigChange('renderer', e.target.value)}
            >
              {rendererOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.fullscreen}
                onChange={(e) => handleConfigChange('fullscreen', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Fullscreen Mode
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.vsync}
                onChange={(e) => handleConfigChange('vsync', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Vertical Sync (VSync)
            </label>
          </div>
        </div>

        {/* Graphics Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Eye size={24} />
              Graphics Settings
            </h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">Anti-aliasing</label>
            <select 
              className="form-select"
              value={config.antialiasing}
              onChange={(e) => handleConfigChange('antialiasing', e.target.value)}
            >
              {antialiasingOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Texture Filtering</label>
            <select 
              className="form-select"
              value={config.textureFiltering}
              onChange={(e) => handleConfigChange('textureFiltering', e.target.value)}
            >
              {textureFilteringOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Frame Rate Limit</label>
            <select 
              className="form-select"
              value={config.frameLimit}
              onChange={(e) => handleConfigChange('frameLimit', e.target.value)}
            >
              {frameLimitOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
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
          
          <div className="form-group">
            <label className="form-label">Audio Driver</label>
            <select 
              className="form-select"
              value={config.audioDriver}
              onChange={(e) => handleConfigChange('audioDriver', e.target.value)}
            >
              {audioDriverOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Audio Latency</label>
            <select 
              className="form-select"
              value={config.audioLatency}
              onChange={(e) => handleConfigChange('audioLatency', e.target.value)}
            >
              {audioLatencyOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Sliders size={24} />
              Advanced Settings
            </h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">Controller Profile</label>
            <select 
              className="form-select"
              value={config.controllerProfile}
              onChange={(e) => handleConfigChange('controllerProfile', e.target.value)}
            >
              {controllerProfileOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Custom Arguments</label>
            <input 
              type="text" 
              className="form-input" 
              value={config.customArgs}
              onChange={(e) => handleConfigChange('customArgs', e.target.value)}
              placeholder="Additional command line arguments..."
            />
            <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
              Advanced users only. These arguments will be passed directly to the emulator.
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Monitor size={24} />
              Performance Settings
            </h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">CPU Threads</label>
            <select 
              className="form-select"
              value={config.cpuThreads}
              onChange={(e) => handleConfigChange('cpuThreads', e.target.value)}
            >
              {cpuThreadsOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Memory Limit</label>
            <select 
              className="form-select"
              value={config.memoryLimit}
              onChange={(e) => handleConfigChange('memoryLimit', e.target.value)}
            >
              {memoryLimitOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.gpuAcceleration}
                onChange={(e) => handleConfigChange('gpuAcceleration', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              GPU Acceleration
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.asyncShaderCompilation}
                onChange={(e) => handleConfigChange('asyncShaderCompilation', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Async Shader Compilation
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.textureCache}
                onChange={(e) => handleConfigChange('textureCache', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Texture Cache
            </label>
          </div>
        </div>

        {/* Compatibility Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Settings size={24} />
              Compatibility Settings
            </h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">Compatibility Mode</label>
            <select 
              className="form-select"
              value={config.compatibilityMode}
              onChange={(e) => handleConfigChange('compatibilityMode', e.target.value)}
            >
              {compatibilityModeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Kernel Version</label>
            <select 
              className="form-select"
              value={config.kernelVersion}
              onChange={(e) => handleConfigChange('kernelVersion', e.target.value)}
            >
              {kernelVersionOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Region Lock</label>
            <select 
              className="form-select"
              value={config.regionLock}
              onChange={(e) => handleConfigChange('regionLock', e.target.value)}
            >
              {regionLockOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Language Override</label>
            <select 
              className="form-select"
              value={config.languageOverride}
              onChange={(e) => handleConfigChange('languageOverride', e.target.value)}
            >
              {languageOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
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
          
          <div className="form-group">
            <label className="form-label">Input Deadzone: {config.inputDeadzone}</label>
            <input 
              type="range" 
              className="form-range"
              min="0"
              max="1"
              step="0.1"
              value={config.inputDeadzone}
              onChange={(e) => handleConfigChange('inputDeadzone', e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.vibrationEnabled}
                onChange={(e) => handleConfigChange('vibrationEnabled', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Controller Vibration
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.keyboardSupport}
                onChange={(e) => handleConfigChange('keyboardSupport', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Keyboard Support
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.mouseSupport}
                onChange={(e) => handleConfigChange('mouseSupport', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Mouse Support
            </label>
          </div>
        </div>

        {/* Audio Enhancement */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Volume2 size={24} />
              Audio Enhancement
            </h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">Audio Channels</label>
            <select 
              className="form-select"
              value={config.audioChannels}
              onChange={(e) => handleConfigChange('audioChannels', e.target.value)}
            >
              {audioChannelsOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Sample Rate</label>
            <select 
              className="form-select"
              value={config.audioSampleRate}
              onChange={(e) => handleConfigChange('audioSampleRate', e.target.value)}
            >
              {audioSampleRateOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Audio Volume: {config.audioVolume}%</label>
            <input 
              type="range" 
              className="form-range"
              min="0"
              max="200"
              step="5"
              value={config.audioVolume}
              onChange={(e) => handleConfigChange('audioVolume', e.target.value)}
            />
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
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.debugMode}
                onChange={(e) => handleConfigChange('debugMode', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Debug Mode
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">Log Level</label>
            <select 
              className="form-select"
              value={config.logLevel}
              onChange={(e) => handleConfigChange('logLevel', e.target.value)}
            >
              {logLevelOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.showFPS}
                onChange={(e) => handleConfigChange('showFPS', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show FPS Counter
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                checked={config.showStats}
                onChange={(e) => handleConfigChange('showStats', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show Performance Stats
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className="btn btn-success"
            onClick={handleLaunchWithConfig}
            style={{ flex: 1, padding: '12px 16px', fontSize: '16px', fontWeight: '600' }}
          >
            <Play size={20} />
            Launch Game
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={handleSaveConfig}
            disabled={!hasUnsavedChanges}
            style={{ padding: '12px 16px', fontSize: '14px', minWidth: '120px' }}
          >
            <Save size={18} />
            Save Config
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={handleResetToDefaults}
            style={{ padding: '12px 16px', fontSize: '14px', minWidth: '140px' }}
          >
            <RotateCcw size={18} />
            Reset to Defaults
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
            You have unsaved changes. Save your configuration before launching the game.
          </div>
        )}
      </div>
    </div>
  );
};

export default GameConfig;