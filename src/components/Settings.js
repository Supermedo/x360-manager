import React, { useState, useContext, useEffect } from 'react';
import useAppFullscreen from '../hooks/useAppFullscreen';
import { SettingsContext } from '../context/SettingsContext';
import { GameContext } from '../context/GameContext';
import {
  FolderOpen, Settings as SettingsIcon, Monitor,
  Cpu, Music, Terminal, Save, Trash2, ShieldAlert,
  Search, RefreshCw, Download, Sliders, User, Eraser
} from 'lucide-react';
import { localCoverResetPatch } from '../services/coverService';
import XeniaProfilesPanel from './XeniaProfilesPanel';
import XboxLiveProfilesPanel from './XboxLiveProfilesPanel';

const Settings = ({ onSwitchProfile }) => {
  const { settings, updateSettings, resetSettings } = useContext(SettingsContext);
  const { games, scanGamesDirectory, batchUpdateGames } = useContext(GameContext);
  const { isFullscreen, setFullscreen } = useAppFullscreen();
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [activeTab, setActiveTab] = useState('paths');
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
    { id: 'paths', label: 'Directories', icon: FolderOpen },
    { id: 'xboxlive', label: 'Xbox Live', icon: User },
    { id: 'profiles', label: 'Graphics Presets', icon: Sliders },
    { id: 'graphics', label: 'Graphics', icon: Monitor },
    { id: 'system', label: 'System', icon: Cpu },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'advanced', label: 'Advanced', icon: Terminal },
    { id: 'danger', label: 'Danger Zone', icon: ShieldAlert }
  ];

  const renderPaths = () => (
    <div className="settings-section">
      <h3 className="section-title">Emulator Configuration</h3>
      <div className="settings-group">
        <label>Xenia Executable Path</label>
        <div className="input-with-button">
          <input
            type="text"
            value={localSettings.emulatorPath || ''}
            onChange={(e) => handleSettingChange('emulatorPath', e.target.value)}
            placeholder="Select or paste path to xenia.exe..."
          />
          <button type="button" className="btn btn-secondary" onClick={handleSelectEmulatorPath}>Browse</button>
        </div>
      </div>
      <div className="settings-group mt-4">
        <label>Default Games Directory</label>
        <div className="input-with-button">
          <input
            type="text"
            value={localSettings.gamesDirectory || ''}
            onChange={(e) => handleSettingChange('gamesDirectory', e.target.value)}
            placeholder="Select or paste games folder path..."
          />
          <button type="button" className="btn btn-secondary" onClick={handleSelectGamesDirectory}>Browse</button>
        </div>
        {localSettings.gamesDirectory && (
          <button className="btn btn-primary mt-2" onClick={handleScanGames} disabled={isScanning}>
            <Search size={16} /> {isScanning ? 'Scanning...' : 'Scan Directory For Games'}
          </button>
        )}
      </div>
    </div>
  );

  const renderGraphics = () => (
    <div className="settings-section">
      <h3 className="section-title">Graphics Settings</h3>
      <div className="grid grid-2 gap-4">
        <div className="settings-group">
          <label>Renderer (GPU API)</label>
          <select value={localSettings.defaultRenderer || 'auto'} onChange={(e) => handleSettingChange('defaultRenderer', e.target.value)}>
            <option value="auto">Auto (Recommended)</option>
            <option value="d3d12">Direct3D 12</option>
            <option value="vulkan">Vulkan</option>
          </select>
        </div>
        <div className="settings-group">
          <label>Resolution Scale</label>
          <select value={localSettings.defaultResolutionScale || '1'} onChange={(e) => handleSettingChange('defaultResolutionScale', e.target.value)}>
            <option value="1">1x (Native 720p)</option>
            <option value="2">2x (1440p)</option>
            <option value="3">3x (4K 2160p)</option>
          </select>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={localSettings.defaultFullscreen || false} onChange={e => handleSettingChange('defaultFullscreen', e.target.checked)} />
          Launch games in fullscreen (Xenia)
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={localSettings.defaultVsync !== false} onChange={e => handleSettingChange('defaultVsync', e.target.checked)} />
          Enable VSync
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={localSettings.showFPS || false} onChange={e => handleSettingChange('showFPS', e.target.checked)} />
          Show In-Game FPS Counter (press F3 in-game to toggle overlay)
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
          Fullscreen app window (F11 or title bar button)
        </label>
      </div>
    </div>
  );

  const renderSystem = () => (
    <div className="settings-section">
      <h3 className="section-title">System Settings</h3>
      <div className="grid grid-2 gap-4">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={localSettings.askProfileOnLaunch !== false}
            onChange={(e) => handleSettingChange('askProfileOnLaunch', e.target.checked)}
          />
          Ask who&apos;s playing when the app opens (multiple profiles)
        </label>
        <div className="settings-group">
          <label>Game Language Override</label>
          <select value={localSettings.defaultLanguage || '1'} onChange={(e) => handleSettingChange('defaultLanguage', e.target.value)}>
            <option value="1">English</option>
            <option value="2">Japanese</option>
            <option value="3">German</option>
            <option value="4">French</option>
            <option value="5">Spanish</option>
            <option value="6">Italian</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderAudio = () => (
    <div className="settings-section">
      <h3 className="section-title">Audio Settings</h3>
      <div className="grid grid-2 gap-4">
        <div className="settings-group">
          <label>Audio Backend</label>
          <select value={localSettings.defaultAudioDriver || 'auto'} onChange={(e) => handleSettingChange('defaultAudioDriver', e.target.value)}>
            <option value="auto">Auto (XAudio2)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderAdvanced = () => (
    <div className="settings-section">
      <h3 className="section-title">Advanced Hacks</h3>
      <div className="grid grid-2 gap-4">
        <label className="checkbox-label">
          <input type="checkbox" checked={localSettings.textureCache || false} onChange={e => handleSettingChange('textureCache', e.target.checked)} />
          Mount Cache (Fixes textures in some games)
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={localSettings.gpuReadback || false} onChange={e => handleSettingChange('gpuReadback', e.target.checked)} />
          D3D12 Readback Resolve (Fixes physics/black screens)
        </label>
      </div>

      <h3 className="section-title mt-6">Cover cache</h3>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
        Downloaded box art is stored locally. Clear the cache if covers look broken or out of date.
      </p>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '12px' }}>
        {coverCacheStats
          ? `${coverCacheStats.fileCount} file(s), ${formatBytes(coverCacheStats.bytes)}`
          : 'Loading cache info…'}
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={loadCoverCacheStats}
          disabled={isClearingCoverCache}
        >
          <RefreshCw size={16} /> Refresh
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleClearCoverCache}
          disabled={isClearingCoverCache || !(coverCacheStats?.fileCount > 0)}
        >
          <Eraser size={16} /> {isClearingCoverCache ? 'Clearing…' : 'Clear cover cache'}
        </button>
      </div>

      <h3 className="section-title mt-6">Game Patches</h3>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '15px' }}>
        Download the community game patches repository for Xenia Canary. Patches can be toggled by opening their TOML files.
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          className="btn btn-primary"
          onClick={handleDownloadPatches}
          disabled={isDownloadingPatches || !localSettings.emulatorPath}
        >
          <Download size={16} /> {isDownloadingPatches ? 'Downloading...' : 'Download Latest Patches'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleOpenPatchesFolder}
          disabled={!localSettings.emulatorPath}
        >
          <FolderOpen size={16} /> Open Patches Folder
        </button>
      </div>
    </div>
  );

  const renderDanger = () => (
    <div className="settings-section border-danger">
      <h3 className="section-title text-danger">Reset Everything</h3>
      <p style={{ marginBottom: "15px" }}>This will remove your current settings and return to defaults.</p>
      <button
        className="btn btn-secondary"
        style={{ marginRight: 12 }}
        onClick={() => {
          updateSettings({ onboardingCompleted: false });
          window.location.reload();
        }}
      >
        Run setup wizard again
      </button>
      <button className="btn btn-danger" onClick={() => {
        resetSettings();
        setLocalSettings({});
      }}>Reset Configuration</button>
    </div>
  );

  return (
    <div className="settings-container fade-in">
      <div className="settings-header">
        <h1>Global Settings</h1>
        {hasUnsavedChanges && (
          <button className="btn btn-primary animate-pulse" onClick={handleSaveSettings}>
            <Save size={18} /> Save Changes
          </button>
        )}
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <Icon size={18} /> {t.label}
              </button>
            )
          })}
        </div>

        <div className="settings-content">
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
