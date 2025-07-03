import React, { createContext, useState, useEffect } from 'react';

export const SettingsContext = createContext();

const defaultSettings = {
  // Emulator settings
  emulatorPath: '',
  gamesDirectory: '',
  setupCompleted: false,
  
  // Xenia-compatible game defaults
  defaultResolutionScale: '1x',
  defaultGpuBackend: 'auto',
  defaultVsync: true,
  defaultFullscreen: false,
  defaultLanguage: 'en',
  defaultLicenseMask: '0xFFFFFFFF',
  defaultAudioChannels: 'stereo',
  defaultAudioSampleRate: '48000',
  
  // DLC and Update Management
  dlcDirectory: '',
  updatesDirectory: '',
  autoDetectDlc: true,
  autoDetectUpdates: true,
  dlcInstallMode: 'automatic',
  updateInstallMode: 'automatic',
  defaultCustomArgs: '',
  // Performance Settings
  defaultCpuThreads: 'auto',
  defaultMemoryLimit: 'auto',
  defaultGpuAcceleration: true,
  defaultAsyncShaderCompilation: true,
  defaultTextureCache: true,

  
  // Interface settings
  theme: 'dark',
  language: 'en',
  minimizeToTray: false,
  startMinimized: false,
  
  // Audio settings
  masterVolume: 100,
  muteInBackground: false,
  
  // Graphics settings
  showFPS: false,
  
  // Advanced settings
  enableLogging: false,
  enableTelemetry: false,
  customEmulatorArgs: '',
  
  // Update settings
  checkUpdates: true,
  autoSaveStates: true
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('x360-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        // Merge with default settings to ensure all properties exist
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error('Error loading settings from localStorage:', error);
        setSettings(defaultSettings);
      }
    }
  }, []);

  // Save settings to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('x360-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      ...newSettings
    }));
  };

  const updateSetting = (key, value) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [key]: value
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('x360-settings');
  };

  const getSetting = (key, fallback = null) => {
    return settings[key] !== undefined ? settings[key] : fallback;
  };

  const exportSettings = () => {
    return { ...settings };
  };

  const importSettings = (importedSettings) => {
    try {
      // Validate imported settings
      if (typeof importedSettings !== 'object' || importedSettings === null) {
        throw new Error('Invalid settings format');
      }
      
      // Merge with current settings, keeping only valid keys
      const validKeys = Object.keys(defaultSettings);
      const filteredSettings = {};
      
      validKeys.forEach(key => {
        if (importedSettings.hasOwnProperty(key)) {
          filteredSettings[key] = importedSettings[key];
        }
      });
      
      updateSettings(filteredSettings);
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  };

  const isEmulatorConfigured = () => {
    return settings.emulatorPath && settings.emulatorPath.trim() !== '';
  };

  const getEmulatorConfig = () => {
    return {
      emulatorPath: settings.emulatorPath,
      gamesDirectory: settings.gamesDirectory,
      defaultResolution: settings.defaultResolution,
      defaultRenderer: settings.defaultRenderer,
      defaultAudioDriver: settings.defaultAudioDriver,
      defaultFullscreen: settings.defaultFullscreen,
      customArgs: settings.customEmulatorArgs
    };
  };

  const getDefaultGameConfig = () => {
    return {
      // Xenia-compatible settings
      resolutionScale: settings.defaultResolutionScale || '1x',
      gpuBackend: settings.defaultGpuBackend || 'auto',
      vsync: settings.defaultVsync !== undefined ? settings.defaultVsync : true,
      fullscreen: settings.defaultFullscreen || false,
      language: settings.defaultLanguage || 'en',
      licenseMask: settings.defaultLicenseMask || '0xFFFFFFFF',
      audioChannels: settings.defaultAudioChannels || 'stereo',
      audioSampleRate: settings.defaultAudioSampleRate || '48000',
      customArgs: settings.defaultCustomArgs || '',
      
      // DLC and Update settings
      dlcDirectory: settings.dlcDirectory || '',
      updatesDirectory: settings.updatesDirectory || '',
      autoDetectDlc: settings.autoDetectDlc !== undefined ? settings.autoDetectDlc : true,
      autoDetectUpdates: settings.autoDetectUpdates !== undefined ? settings.autoDetectUpdates : true,
      dlcInstallMode: settings.dlcInstallMode || 'automatic',
      updateInstallMode: settings.updateInstallMode || 'automatic'
    };
  };

  const validateSettings = () => {
    const issues = [];
    
    if (!settings.emulatorPath) {
      issues.push('Emulator path not configured');
    }
    
    if (settings.masterVolume < 0 || settings.masterVolume > 100) {
      issues.push('Invalid master volume value');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  };

  const getThemeConfig = () => {
    return {
      theme: settings.theme,
      language: settings.language
    };
  };

  const value = {
    settings,
    updateSettings,
    updateSetting,
    resetSettings,
    getSetting,
    exportSettings,
    importSettings,
    isEmulatorConfigured,
    getEmulatorConfig,
    getDefaultGameConfig,
    validateSettings,
    getThemeConfig
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};