import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Copy, Download, FolderOpen, Plus, Star, Trash2, Zap } from 'lucide-react';
import { SettingsContext } from '../context/SettingsContext';
import {
  BUILTIN_PROFILES,
  createCustomProfile,
  loadAllProfiles,
  saveCustomProfiles
} from '../services/xeniaProfiles';

const XeniaProfilesPanel = ({ localSettings, onDefaultProfileChange }) => {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [profiles, setProfiles] = useState(() => loadAllProfiles());
  const [selectedId, setSelectedId] = useState(settings.defaultXeniaProfileId || 'builtin-balanced');
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState('');

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedId) || profiles[0],
    [profiles, selectedId]
  );

  const refreshProfiles = useCallback(() => {
    setProfiles(loadAllProfiles());
  }, []);

  const persistCustom = useCallback((nextProfiles) => {
    saveCustomProfiles(nextProfiles);
    setProfiles(nextProfiles);
  }, []);

  const handleSetDefault = () => {
    if (settings.xeniaPresetsEnabled === false) {
      setStatus('Turn on graphics presets to set a default profile.');
      return;
    }
    updateSettings({ defaultXeniaProfileId: selectedId });
    onDefaultProfileChange?.(selectedId);
    setStatus(`Default profile set to "${selectedProfile?.name}".`);
  };

  const handleApplyToXenia = async () => {
    if (settings.xeniaPresetsEnabled === false) {
      setStatus('Turn on graphics presets above to apply a preset to xenia.config.toml.');
      return;
    }
    if (!settings.emulatorPath) {
      setStatus('Set your Xenia path in Directories first.');
      return;
    }
    if (!selectedProfile) return;
    setStatus('Applying profile to Xenia config…');
    const result = await window.electronAPI?.applyXeniaProfile?.(
      settings.emulatorPath,
      selectedProfile.settings,
      null
    );
    if (result?.ok) {
      setStatus(`Applied "${selectedProfile.name}".`);
    } else {
      setStatus(result?.error || 'Failed to apply profile.');
    }
  };

  const handleCreateCustom = () => {
    const name = newName.trim() || `Profile ${profiles.filter((p) => !p.builtin).length + 1}`;
    const template = selectedProfile?.settings || BUILTIN_PROFILES[0].settings;
    const profile = createCustomProfile(name, { ...template });
    const next = [...profiles, profile];
    persistCustom(next);
    setSelectedId(profile.id);
    setNewName('');
    setStatus(`Created profile "${profile.name}".`);
  };

  const handleDuplicate = () => {
    if (!selectedProfile || selectedProfile.builtin) {
      setStatus('Select a custom profile to duplicate, or create a new one from a preset.');
      return;
    }
    const copy = createCustomProfile(`${selectedProfile.name} Copy`, { ...selectedProfile.settings });
    const next = [...profiles, copy];
    persistCustom(next);
    setSelectedId(copy.id);
    setStatus(`Duplicated as "${copy.name}".`);
  };

  const handleDelete = () => {
    if (!selectedProfile || selectedProfile.builtin) {
      setStatus('Built-in presets cannot be deleted.');
      return;
    }
    if (!window.confirm(`Delete profile "${selectedProfile.name}"?`)) return;
    const next = profiles.filter((p) => p.id !== selectedProfile.id);
    persistCustom(next);
    setSelectedId('builtin-balanced');
    if (settings.defaultXeniaProfileId === selectedProfile.id) {
      updateSettings({ defaultXeniaProfileId: 'builtin-balanced' });
    }
    setStatus('Profile deleted.');
  };

  const handleExportToml = async () => {
    if (!selectedProfile) return;
    const result = await window.electronAPI?.exportXeniaProfileToml?.(selectedProfile.settings);
    if (result?.ok) {
      setStatus(`Exported to ${result.path}`);
    } else if (!result?.cancelled) {
      setStatus(result?.error || 'Export failed.');
    }
  };

  const handleOpenConfigFolder = async () => {
    if (!settings.emulatorPath) {
      setStatus('Set your Xenia path first.');
      return;
    }
    await window.electronAPI?.openXeniaConfigFolder?.(settings.emulatorPath);
  };

  const presetsEnabled = settings.xeniaPresetsEnabled !== false;

  const handleTogglePresets = (enabled) => {
    updateSettings({ xeniaPresetsEnabled: enabled });
    setStatus(
      enabled
        ? 'Graphics presets enabled. They will apply on launch and when you use Apply to Xenia Config.'
        : 'Graphics presets disabled. Xenia config will not be patched on launch — use Graphics settings or edit config manually.'
    );
  };

  return (
    <div className={`settings-section xenia-presets-panel${presetsEnabled ? '' : ' xenia-presets-panel--off'}`}>
      <h3 className="section-title">Graphics Presets</h3>

      <label className="xenia-presets-toggle checkbox-label">
        <input
          type="checkbox"
          checked={presetsEnabled}
          onChange={(e) => handleTogglePresets(e.target.checked)}
        />
        <span>
          <strong>Use graphics presets</strong>
          <span className="xenia-presets-toggle__hint">
            When off, presets will not overwrite <code>xenia.config.toml</code> on launch.
            Launch flags still come from Settings → Graphics and per-game options.
          </span>
        </span>
      </label>

      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
        Presets map to Xenia launch options and config files. Assign a default profile for new launches,
        or pick one per game in Game Configuration.
      </p>

      <div className="xenia-profiles-grid" aria-disabled={!presetsEnabled}>
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className={`xenia-profile-card${selectedId === profile.id ? ' is-selected' : ''}${profile.builtin ? ' is-builtin' : ''}`}
            onClick={() => setSelectedId(profile.id)}
          >
            <div className="xenia-profile-card-title">{profile.name}</div>
            <div className="xenia-profile-card-desc">{profile.description}</div>
            <div className="xenia-profile-card-meta">
              {profile.settings.renderer !== 'auto' ? profile.settings.renderer : 'auto GPU'}
              {' · '}
              {profile.settings.resolution?.replace('x', '') || '720p'}
              {profile.settings.vsync === false ? ' · no VSync' : ''}
            </div>
            {settings.defaultXeniaProfileId === profile.id && (
              <span className="xenia-profile-badge">Default</span>
            )}
          </button>
        ))}
      </div>

      {selectedProfile && (
        <div className="card" style={{ marginTop: '16px', padding: '16px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>{selectedProfile.name}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>{selectedProfile.description}</p>
          <ul className="xenia-profile-detail-list">
            <li>Resolution: {selectedProfile.settings.resolution}</li>
            <li>Renderer: {selectedProfile.settings.renderer}</li>
            <li>VSync: {selectedProfile.settings.vsync !== false ? 'On' : 'Off'}</li>
            <li>Fullscreen: {selectedProfile.settings.fullscreen ? 'Yes' : 'No'}</li>
            <li>Mount cache: {selectedProfile.settings.textureCache ? 'Yes' : 'No'}</li>
            <li>FPS overlay: {selectedProfile.settings.showFPS ? 'Yes (F3 in-game)' : 'No'}</li>
          </ul>
        </div>
      )}

      <div className="xenia-presets-panel__actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
        <button type="button" className="btn btn-toolbar btn-toolbar--accent" onClick={handleSetDefault} disabled={!presetsEnabled}>
          <Star size={15} /> Set as Default
        </button>
        <button type="button" className="btn btn-primary" onClick={handleApplyToXenia} disabled={!settings.emulatorPath || !presetsEnabled}>
          <Zap size={15} /> Apply to Xenia Config
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleExportToml} disabled={!presetsEnabled}>
          <Download size={15} /> Export TOML
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleOpenConfigFolder} disabled={!settings.emulatorPath}>
          <FolderOpen size={15} /> Open config Folder
        </button>
        {!selectedProfile?.builtin && (
          <>
            <button type="button" className="btn btn-secondary" onClick={handleDuplicate}>
              <Copy size={15} /> Duplicate
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={15} /> Delete
            </button>
          </>
        )}
      </div>

      <div className="xenia-presets-panel__actions" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '14px' }}>Create Custom Profile</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '10px' }}>
          Copies settings from the selected preset above, then you can tweak per-game in Game Config.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Profile name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1, minWidth: '180px', maxWidth: '320px' }}
          />
          <button type="button" className="btn btn-secondary" onClick={handleCreateCustom}>
            <Plus size={15} /> Create Profile
          </button>
        </div>
      </div>

      {status && (
        <p style={{ color: '#9bc848', fontSize: '13px', marginTop: '12px' }}>{status}</p>
      )}
    </div>
  );
};

export default XeniaProfilesPanel;
