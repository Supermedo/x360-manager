import React, { useState, useContext, useEffect } from 'react';
import useAppFullscreen from '../hooks/useAppFullscreen';
import { SettingsContext } from '../context/SettingsContext';
import { GameContext } from '../context/GameContext';
import {
  FolderOpen, Settings as SettingsIcon, Monitor,
  Cpu, Music, Terminal, Save, Trash2, ShieldAlert,
  Search, RefreshCw, Download, Sliders, User, Eraser, Globe
} from 'lucide-react';
import { localCoverResetPatch } from '../services/coverService';
import XeniaProfilesPanel from './XeniaProfilesPanel';
import XboxLiveProfilesPanel from './XboxLiveProfilesPanel';
import { AppVersionSettings } from './UpdateNotifier';
import { APP_LANGUAGES } from '../constants/appLanguages';
import { XENIA_GAME_LANGUAGE_OPTIONS, normalizeDefaultLanguage } from '../constants/xeniaLanguages';
import useTranslation from '../hooks/useTranslation';

const Settings = ({ onSwitchProfile }) => {
  const { settings, updateSettings, resetSettings } = useContext(SettingsContext);
  const { games, scanGamesDirectory, batchUpdateGames } = useContext(GameContext);
  const { isFullscreen, setFullscreen } = useAppFullscreen();
  const { t } = useTranslation();
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [activeTab, setActiveTab] = useState('system');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isDownloadingPatches, setIsDownloadingPatches] = useState(false);
  const [coverCacheStats, setCoverCacheStats] = useState(null);
  const [isClearingCoverCache, setIsClearingCoverCache] = useState(false);

  const formatBytes = (bytes) => {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const loadCoverCacheStats = async () => {
    if (!window.electronAPI?.getCoverCacheStats) return;
    const stats = await window.electronAPI.getCoverCacheStats();
    if (stats?.ok) setCoverCacheStats(stats);
  };

  useEffect(() => {
    if (activeTab === 'advanced') loadCoverCacheStats();
  }, [activeTab]);

  const handleClearCoverCache = async () => {
    if (!window.electronAPI?.clearCoverCache) {
      alert('Cover cache cleanup is only available in the desktop app.');
      return;
    }
    const count = coverCacheStats?.fileCount ?? 0;
    const size = formatBytes(coverCacheStats?.bytes);
    const confirmed = window.confirm(
      count > 0
        ? `Delete ${count} cached cover image(s) (${size})?\n\nCovers will re-download from the internet when you open the library.`
        : 'Cover cache is already empty.'
    );
    if (!confirmed || count === 0) return;

    setIsClearingCoverCache(true);
    try {
      const result = await window.electronAPI.clearCoverCache();
      if (!result?.ok) {
        alert(result?.error || 'Failed to clear cover cache.');
        return;
      }
      const updatesMap = {};
      games.forEach((game) => {
        const patch = localCoverResetPatch(game);
        if (patch) updatesMap[game.id] = patch;
      });
      if (Object.keys(updatesMap).length > 0) {
        batchUpdateGames(updatesMap);
      }
      await loadCoverCacheStats();
      window.electronAPI?.showMessageBox?.({
        type: 'info',
        title: 'Cache cleared',
        message: `Removed ${result.deleted} file(s), freed ${formatBytes(result.bytesFreed)}.`
      });
    } finally {
      setIsClearingCoverCache(false);
    }
  };

  useEffect(() => {
    setLocalSettings((prev) => ({ ...prev, appFullscreen: isFullscreen }));
  }, [isFullscreen]);

  const handleSettingChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleLanguageChange = (lang) => {
    setLocalSettings((prev) => ({ ...prev, language: lang }));
    updateSettings({ language: lang });
  };

  const handleThemeChange = (theme) => {
    setLocalSettings((prev) => ({ ...prev, theme }));
    updateSettings({ theme });
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    updateSettings(localSettings);
    setHasUnsavedChanges(false);
  };

  const handleSelectEmulatorPath = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectEmulatorPath();
    if (path) handleSettingChange('emulatorPath', path);
  };

  const handleSelectGamesDirectory = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectDirectory();
    if (path) handleSettingChange('gamesDirectory', path);
  };

  const handleScanGames = async () => {
    if (!localSettings.gamesDirectory) return;
    setIsScanning(true);
    try {
      await scanGamesDirectory(localSettings.gamesDirectory);
      window.electronAPI?.showMessageBox({ type: 'info', title: 'Scan Complete', message: 'directory scanned successfully!' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleDownloadPatches = async () => {
    if (!localSettings.emulatorPath) {
      alert("Please select your emulator path first.");
      return;
    }
    setIsDownloadingPatches(true);
    try {
      const res = await window.electronAPI.downloadPatches(localSettings.emulatorPath);
      if (res.success) {
        window.electronAPI?.showMessageBox({ type: 'info', title: 'Success', message: `Downloaded and extracted ${res.count} game patches successfully!` });
      } else {
        alert("Failed to download patches: " + res.error);
      }
    } finally {
      setIsDownloadingPatches(false);
    }
  };

  const handleOpenPatchesFolder = async () => {
    if (!localSettings.emulatorPath) return;
    await window.electronAPI.openPatchesFolder(localSettings.emulatorPath);
  };

  const tabs = [
    { id: 'interface', label: t('tabInterface'), icon: Globe },
    { id: 'paths', label: t('tabDirectories'), icon: FolderOpen },
    { id: 'xboxlive', label: t('tabXboxLive'), icon: User },
    { id: 'profiles', label: t('tabGraphicsPresets'), icon: Sliders },
    { id: 'graphics', label: t('tabGraphics'), icon: Monitor },
    { id: 'system', label: t('tabSystem'), icon: Cpu },
    { id: 'audio', label: t('tabAudio'), icon: Music },
    { id: 'advanced', label: t('tabAdvanced'), icon: Terminal },
    { id: 'danger', label: t('tabDanger'), icon: ShieldAlert }
  ];

  const renderInterface = () => (
    <div className="settings-section">
      <h3 className="section-title">{t('interfaceTitle')}</h3>
      <div className="settings-group">
        <label>{t('appLanguage')}</label>
        <select
          value={localSettings.language || 'en'}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          {APP_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.nativeLabel}</option>
          ))}
        </select>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>
          {t('appLanguageDesc')}
        </p>
      </div>
      <div className="settings-group mt-4">
        <label>{t('theme')}</label>
        <select
          value={localSettings.theme || 'dark'}
          onChange={(e) => handleThemeChange(e.target.value)}
        >
          <option value="dark">{t('themeDark')}</option>
          <option value="light">{t('themeLight')}</option>
        </select>
      </div>
    </div>
  );

  const renderPaths = () => (
    <div className="settings-section">
      <h3 className="section-title">{t('emulatorConfigurationTitle')}</h3>
      <div className="settings-group">
        <label>{t('xeniaExecutablePath')}</label>
        <div className="input-with-button">
          <input
            type="text"
            value={localSettings.emulatorPath || ''}
            onChange={(e) => handleSettingChange('emulatorPath', e.target.value)}
            placeholder={t('xeniaPathPlaceholder')}
          />
          <button type="button" className="btn btn-secondary" onClick={handleSelectEmulatorPath}>{t('browse')}</button>
        </div>
      </div>
      <div className="settings-group mt-4">
        <label>{t('defaultGamesDirectory')}</label>
        <div className="input-with-button">
          <input
            type="text"
            value={localSettings.gamesDirectory || ''}
            onChange={(e) => handleSettingChange('gamesDirectory', e.target.value)}
            placeholder={t('gamesDirectoryPlaceholder')}
          />
          <button type="button" className="btn btn-secondary" onClick={handleSelectGamesDirectory}>{t('browse')}</button>
        </div>
        {localSettings.gamesDirectory && (
          <button className="btn btn-primary mt-2" onClick={handleScanGames} disabled={isScanning}>
            <Search size={16} /> {isScanning ? t('scanning') : t('scanDirectoryForGames')}
          </button>
        )}
      </div>
    </div>
  );

  const renderGraphics = () => (
    <div className="settings-section">
      <h3 className="section-title">{t('graphicsSettingsTitle')}</h3>
      <div className="grid grid-2 gap-4">
        <div className="settings-group">
          <label>{t('rendererGpuApi')}</label>
          <select value={localSettings.defaultRenderer || 'auto'} onChange={(e) => handleSettingChange('defaultRenderer', e.target.value)}>
            <option value="auto">{t('rendererAutoRecommended')}</option>
            <option value="d3d12">{t('rendererD3d12')}</option>
            <option value="vulkan">{t('rendererVulkan')}</option>
          </select>
        </div>
        <div className="settings-group">
          <label>{t('resolutionScale')}</label>
          <select value={localSettings.defaultResolutionScale || '1'} onChange={(e) => handleSettingChange('defaultResolutionScale', e.target.value)}>
            <option value="1">{t('resolution1x')}</option>
            <option value="2">{t('resolution2x')}</option>
            <option value="3">{t('resolution3x')}</option>
          </select>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={localSettings.defaultFullscreen || false} onChange={e => handleSettingChange('defaultFullscreen', e.target.checked)} />
          {t('launchGamesFullscreen')}
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={localSettings.defaultVsync !== false} onChange={e => handleSettingChange('defaultVsync', e.target.checked)} />
          {t('enableVsync')}
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={localSettings.showFPS || false} onChange={e => handleSettingChange('showFPS', e.target.checked)} />
          {t('showInGameFpsCounter')}
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isFullscreen}
            onChange={async (e) => {
              const enabled = e.target.checked;
              handleSettingChange('appFullscreen', enabled);
              await setFullscreen(enabled);
            }}
          />
          {t('fullscreenAppWindow')}
        </label>
      </div>
    </div>
  );

  const renderSystem = () => (
    <div className="settings-section">
      <h3 className="section-title">{t('tabSystem')}</h3>
      <div className="grid grid-2 gap-4">
        <div className="settings-group" style={{ gridColumn: '1 / -1' }}>
          <label>{t('appLanguage')}</label>
          <select
            value={localSettings.language || 'en'}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            {APP_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.nativeLabel}</option>
            ))}
          </select>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>
            {t('appLanguageDesc')}
          </p>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={localSettings.askProfileOnLaunch !== false}
            onChange={(e) => handleSettingChange('askProfileOnLaunch', e.target.checked)}
          />
          Ask who&apos;s playing when the app opens (multiple profiles)
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={localSettings.checkUpdates !== false}
            onChange={(e) => handleSettingChange('checkUpdates', e.target.checked)}
          />
          {t('checkUpdates')}
        </label>
        <div className="settings-group" style={{ gridColumn: '1 / -1' }}>
          <label>{t('defaultGameLanguage')}</label>
          <select
            value={normalizeDefaultLanguage(localSettings.defaultLanguage)}
            onChange={(e) => handleSettingChange('defaultLanguage', e.target.value)}
          >
            {XENIA_GAME_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>
            {t('defaultGameLanguageDesc')}
          </p>
        </div>
      </div>
      <AppVersionSettings />
    </div>
  );

  const renderAudio = () => (
    <div className="settings-section">
      <h3 className="section-title">{t('audioSettingsTitle')}</h3>
      <div className="grid grid-2 gap-4">
        <div className="settings-group">
          <label>{t('audioBackend')}</label>
          <select value={localSettings.defaultAudioDriver || 'auto'} onChange={(e) => handleSettingChange('defaultAudioDriver', e.target.value)}>
            <option value="auto">{t('audioBackendAuto')}</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderAdvanced = () => (
    <div className="settings-section">
      <h3 className="section-title">{t('advancedHacksTitle')}</h3>
      <div className="grid grid-2 gap-4">
        <label className="checkbox-label">
          <input type="checkbox" checked={localSettings.textureCache || false} onChange={e => handleSettingChange('textureCache', e.target.checked)} />
          {t('mountCache')}
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={localSettings.gpuReadback || false} onChange={e => handleSettingChange('gpuReadback', e.target.checked)} />
          {t('d3d12ReadbackResolve')}
        </label>
      </div>

      <h3 className="section-title mt-6">{t('coverCacheTitle')}</h3>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
        {t('coverCacheDescription')}
      </p>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '12px' }}>
        {coverCacheStats
          ? `${coverCacheStats.fileCount} file(s), ${formatBytes(coverCacheStats.bytes)}`
          : t('loadingCacheInfo')}
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={loadCoverCacheStats}
          disabled={isClearingCoverCache}
        >
          <RefreshCw size={16} /> {t('refresh')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleClearCoverCache}
          disabled={isClearingCoverCache || !(coverCacheStats?.fileCount > 0)}
        >
          <Eraser size={16} /> {isClearingCoverCache ? t('clearing') : t('clearCoverCache')}
        </button>
      </div>

      <h3 className="section-title mt-6">{t('gamePatchesTitle')}</h3>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '15px' }}>
        {t('gamePatchesDescription')}
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          className="btn btn-primary"
          onClick={handleDownloadPatches}
          disabled={isDownloadingPatches || !localSettings.emulatorPath}
        >
          <Download size={16} /> {isDownloadingPatches ? t('downloading') : t('downloadLatestPatches')}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleOpenPatchesFolder}
          disabled={!localSettings.emulatorPath}
        >
          <FolderOpen size={16} /> {t('openPatchesFolder')}
        </button>
      </div>
    </div>
  );

  const renderDanger = () => (
    <div className="settings-section border-danger">
      <h3 className="section-title text-danger">{t('resetEverythingTitle')}</h3>
      <p style={{ marginBottom: "15px" }}>{t('resetEverythingDescription')}</p>
      <button
        className="btn btn-secondary"
        style={{ marginRight: 12 }}
        onClick={() => {
          updateSettings({ onboardingCompleted: false });
          window.location.reload();
        }}
      >
        {t('runSetupWizardAgain')}
      </button>
      <button className="btn btn-danger" onClick={() => {
        resetSettings();
        setLocalSettings({});
      }}>{t('resetConfiguration')}</button>
    </div>
  );

  return (
    <div className="settings-container fade-in">
      <div className="settings-header">
        <h1>{t('globalSettings')}</h1>
        {hasUnsavedChanges && (
          <button className="btn btn-primary animate-pulse" onClick={handleSaveSettings}>
            <Save size={18} /> {t('saveChanges')}
          </button>
        )}
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="settings-content">
          {activeTab === 'interface' && renderInterface()}
          {activeTab === 'paths' && renderPaths()}
          {activeTab === 'xboxlive' && <XboxLiveProfilesPanel onSwitchProfile={onSwitchProfile} />}
          {activeTab === 'profiles' && (
            <XeniaProfilesPanel
              localSettings={localSettings}
              onDefaultProfileChange={(id) => handleSettingChange('defaultXeniaProfileId', id)}
            />
          )}
          {activeTab === 'graphics' && renderGraphics()}
          {activeTab === 'system' && renderSystem()}
          {activeTab === 'audio' && renderAudio()}
          {activeTab === 'advanced' && renderAdvanced()}
          {activeTab === 'danger' && renderDanger()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
