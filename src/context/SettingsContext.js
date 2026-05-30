import React, { createContext, useState, useEffect, useRef } from 'react';
import { loadPersisted, savePersisted } from '../utils/persistentStorage';
import { createDebouncedPersist } from '../utils/debouncePersist';

export const SettingsContext = createContext();

const defaultSettings = {
  emulatorPath: '',
  gamesDirectory: '',
  setupCompleted: false,
  onboardingCompleted: false,
  askProfileOnLaunch: true,
  defaultResolutionScale: '1x',
  defaultGpuBackend: 'auto',
  defaultVsync: true,
  defaultFullscreen: false,
  defaultLanguage: 'en',
  defaultLicenseMask: '0xFFFFFFFF',
  defaultAudioChannels: 'stereo',
  defaultAudioSampleRate: '48000',
  dlcDirectory: '',
  updatesDirectory: '',
  autoDetectDlc: true,
  autoDetectUpdates: true,
  dlcInstallMode: 'automatic',
  updateInstallMode: 'automatic',
  defaultCustomArgs: '',
  defaultCpuThreads: 'auto',
  defaultMemoryLimit: 'auto',
  defaultGpuAcceleration: true,
  defaultAsyncShaderCompilation: true,
  defaultTextureCache: true,
  theme: 'dark',
  language: 'en',
  minimizeToTray: false,
  startMinimized: false,
  masterVolume: 100,
  muteInBackground: false,
  showFPS: false,
  appFullscreen: false,
  defaultXeniaProfileId: 'builtin-balanced',
  xeniaPresetsEnabled: true,
  activeXboxLiveProfileId: null,
  sessionXboxLiveProfileId: null,
  sessionGamertag: null,
  sessionAvatar: null,
  enableLogging: false,
  enableTelemetry: false,
  customEmulatorArgs: '',
  checkUpdates: true,
  autoSaveStates: true
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const canPersist = useRef(false);
  const debouncedSaveSettings = useRef(createDebouncedPersist(600));
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const parsed = await loadPersisted('settings', null);
      if (cancelled) return;

      if (parsed && typeof parsed === 'object') {
        if (parsed.setupCompleted && parsed.emulatorPath && !parsed.onboardingCompleted) {
          parsed.onboardingCompleted = true;
        }
        setSettings({ ...defaultSettings, ...parsed });
        canPersist.current = true;
      }

      setHydrated(true);
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !canPersist.current) return;
    debouncedSaveSettings.current('settings', settings);
  }, [settings, hydrated]);

  useEffect(() => {
    const flush = () => {
      if (canPersist.current) {
        savePersisted('settings', settingsRef.current);
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  const updateSettings = (newSettings) => {
    canPersist.current = true;
    setSettings((prevSettings) => ({
      ...prevSettings,
      ...newSettings
    }));
  };

  const updateSetting = (key, value) => {
    canPersist.current = true;
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    savePersisted('settings', defaultSettings);
  };

  const getSetting = (key, fallback = null) => {
    return settings[key] !== undefined ? settings[key] : fallback;
  };

  const exportSettings = () => ({ ...settings });

  const importSettings = (importedSettings) => {
    try {
      if (typeof importedSettings !== 'object' || importedSettings === null) {
        throw new Error('Invalid settings format');
      }
      const validKeys = Object.keys(defaultSettings);
      const filteredSettings = {};
      validKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(importedSettings, key)) {
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

  const isEmulatorConfigured = () => settings.emulatorPath && settings.emulatorPath.trim() !== '';

  const getEmulatorConfig = () => ({
    emulatorPath: settings.emulatorPath,
    gamesDirectory: settings.gamesDirectory,
    defaultResolution: settings.defaultResolution,
    defaultRenderer: settings.defaultRenderer,
    defaultAudioDriver: settings.defaultAudioDriver,
    defaultFullscreen: settings.defaultFullscreen,
    customArgs: settings.customEmulatorArgs
  });

  const getDefaultGameConfig = () => ({
    resolutionScale: settings.defaultResolutionScale || '1x',
    gpuBackend: settings.defaultGpuBackend || 'auto',
    vsync: settings.defaultVsync !== undefined ? settings.defaultVsync : true,
    fullscreen: settings.defaultFullscreen || false,
    language: settings.defaultLanguage || 'en',
    licenseMask: settings.defaultLicenseMask || '0xFFFFFFFF',
    audioChannels: settings.defaultAudioChannels || 'stereo',
    audioSampleRate: settings.defaultAudioSampleRate || '48000',
    customArgs: settings.defaultCustomArgs || '',
    dlcDirectory: settings.dlcDirectory || '',
    updatesDirectory: settings.updatesDirectory || '',
    autoDetectDlc: settings.autoDetectDlc !== undefined ? settings.autoDetectDlc : true,
    autoDetectUpdates: settings.autoDetectUpdates !== undefined ? settings.autoDetectUpdates : true,
    dlcInstallMode: settings.dlcInstallMode || 'automatic',
    updateInstallMode: settings.updateInstallMode || 'automatic'
  });

  const validateSettings = () => {
    const issues = [];
    if (!settings.emulatorPath) {
      issues.push('Emulator path not configured');
    }
    if (settings.masterVolume < 0 || settings.masterVolume > 100) {
      issues.push('Invalid master volume value');
    }
    return { isValid: issues.length === 0, issues };
  };

  const getThemeConfig = () => ({
    theme: settings.theme,
    language: settings.language
  });

  const value = {
    settings,
    hydrated,
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
