import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Trash2,
  Download,
  FolderOpen,
  Save,
  RefreshCw,
  Users,
  Lock,
  Sparkles
} from 'lucide-react';
import { SettingsContext } from '../context/SettingsContext';
import {
  XBOX_COUNTRIES,
  XBOX_LANGUAGES,
  SUBSCRIPTION_TIERS
} from '../services/xboxLiveProfileMeta';
import AvatarBuilder from './AvatarBuilder';
import ProfileAvatar from './ProfileAvatar';

const emptyDraft = () => ({
  gamertag: 'User',
  country: 0,
  language: 0,
  xboxLiveEnabled: false,
  subscriptionTier: 0,
  signInState: 1,
  controllerSlot: 0,
  maxSignedProfiles: 1
});

const avatarInitials = (tag) => {
  const t = (tag || 'User').trim();
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  return t.slice(0, 1).toUpperCase() || 'U';
};

const XboxLiveProfilesPanel = ({ onSwitchProfile }) => {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [hasPin, setHasPin] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [pinDraft, setPinDraft] = useState({ newPin: '', confirmPin: '', currentPin: '' });
  const [pinMode, setPinMode] = useState('none');
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState('ok');
  const [loading, setLoading] = useState(false);

  const sessionId = settings.sessionXboxLiveProfileId || settings.activeXboxLiveProfileId;

  const loadMyProfile = useCallback(async () => {
    if (!settings.emulatorPath || !sessionId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await window.electronAPI?.listXboxLiveProfiles?.(settings.emulatorPath);
      if (!result?.ok) {
        setStatus(result?.error || 'Could not load profile.');
        setStatusKind('warn');
        return;
      }
      const mine = (result.profiles || []).find(
        (p) => p.id === sessionId || p.profileKey === sessionId
      );
      if (!mine) {
        setProfile(null);
        setStatus('Profile not found. Switch profile and try again.');
        setStatusKind('warn');
        return;
      }
      setProfile(mine);
      setHasPin(Boolean(mine.hasPin));
      setAvatar(mine.avatar || null);
      setDraft({
        gamertag: mine.gamertag || 'User',
        country: mine.country ?? 0,
        language: mine.language ?? 0,
        xboxLiveEnabled: Boolean(mine.xboxLiveEnabled),
        subscriptionTier: mine.subscriptionTier ?? 0,
        signInState: mine.signInState ?? 1,
        controllerSlot: mine.controllerSlot ?? 0,
        maxSignedProfiles: mine.maxSignedProfiles ?? 1
      });
      setPinDraft({ newPin: '', confirmPin: '', currentPin: '' });
      setPinMode('none');
      setStatus('');
    } catch (err) {
      setStatus(err.message || 'Could not load profile.');
      setStatusKind('warn');
    } finally {
      setLoading(false);
    }
  }, [settings.emulatorPath, sessionId]);

  useEffect(() => {
    loadMyProfile();
  }, [loadMyProfile]);

  useEffect(() => () => setShowBuilder(false), []);

  const handleSave = async () => {
    if (!profile) return;
    setStatus('');
    setStatusKind('ok');

    let pinFields;
    if (pinMode === 'set' || pinMode === 'change') {
      if (pinDraft.newPin.length < 4) {
        setStatusKind('warn');
        setStatus('PIN must be at least 4 characters.');
        return;
      }
      if (pinDraft.newPin !== pinDraft.confirmPin) {
        setStatusKind('warn');
        setStatus('PINs do not match.');
        return;
      }
      pinFields = {
        newPin: pinDraft.newPin,
        currentPin: hasPin ? pinDraft.currentPin : undefined
      };
      if (hasPin && !pinDraft.currentPin) {
        setStatusKind('warn');
        setStatus('Enter your current PIN.');
        return;
      }
    } else if (pinMode === 'remove') {
      if (!pinDraft.currentPin) {
        setStatusKind('warn');
        setStatus('Enter your current PIN to remove it.');
        return;
      }
      pinFields = { clearPin: true, currentPin: pinDraft.currentPin };
    }

    const payload = {
      ...profile,
      ...draft,
      gamertag: draft.gamertag.trim() || 'User',
      avatar,
      pinFields
    };

    const result = await window.electronAPI?.saveXboxLiveProfile?.(
      settings.emulatorPath,
      payload,
      true
    );

    if (result?.ok) {
      updateSettings({
        activeXboxLiveProfileId: result.activeProfileId || profile.id,
        sessionXboxLiveProfileId: profile.id,
        sessionGamertag: draft.gamertag.trim() || 'User',
        sessionAvatar: avatar || null
      });
      setStatusKind('ok');
      setStatus('Saved.');
      await loadMyProfile();
    } else {
      setStatusKind('warn');
      setStatus(result?.error || 'Save failed.');
    }
  };

  const handleDelete = async () => {
    if (!profile) return;
    if (hasPin && !pinDraft.currentPin) {
      setStatusKind('warn');
      setStatus('Enter your PIN to delete this profile.');
      return;
    }
    if (hasPin) {
      const check = await window.electronAPI?.verifyXboxLiveProfilePin?.(
        settings.emulatorPath,
        profile.profileKey,
        pinDraft.currentPin
      );
      if (!check?.ok) {
        setStatusKind('warn');
        setStatus(check?.error || 'Wrong PIN.');
        return;
      }
    }
    if (!window.confirm(`Delete "${profile.gamertag}" from this PC?`)) return;
    const result = await window.electronAPI?.deleteXboxLiveProfile?.(
      settings.emulatorPath,
      profile.profileKey
    );
    if (result?.ok) {
      updateSettings({ sessionXboxLiveProfileId: null, activeXboxLiveProfileId: null });
      onSwitchProfile?.();
    } else {
      setStatusKind('warn');
      setStatus(result?.error || 'Delete failed.');
    }
  };

  const handleExport = async () => {
    if (!profile?.filePath) return;
    const result = await window.electronAPI?.exportXboxLiveProfile?.(profile.filePath);
    if (result?.ok) {
      setStatusKind('ok');
      setStatus(`Exported to ${result.path}`);
    } else if (!result?.cancelled) {
      setStatusKind('warn');
      setStatus(result?.error || 'Export failed.');
    }
  };

  if (!sessionId) {
    return (
      <div className="settings-section xlive-panel">
        <h3>My profile</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No profile signed in.</p>
        <button type="button" className="btn btn-primary" onClick={onSwitchProfile}>
          <Users size={16} /> Choose profile
        </button>
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="settings-section xlive-panel">
        <h3>My profile</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{status || 'Profile unavailable.'}</p>
        <button type="button" className="btn btn-primary" onClick={onSwitchProfile}>
          <Users size={16} /> Switch profile
        </button>
      </div>
    );
  }

  return (
    <div className={`xlive-panel settings-section xlive-panel--self${loading ? ' xlive-loading' : ''}`}>
      <header className="xlive-panel__header">
        <div>
          <h3>My profile</h3>
          <p>Only you can edit this profile while signed in.</p>
        </div>
        <div className="xlive-header-actions">
          <button type="button" className="xlive-btn-ghost" onClick={onSwitchProfile}>
            <Users size={14} /> Switch profile
          </button>
          <button type="button" className="xlive-btn-ghost" onClick={loadMyProfile} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </header>

      {profile && (
        <>
          <div className="xlive-identity xlive-identity--solo">
            <button
              type="button"
              className="xlive-identity__avatar xlive-identity__avatar--button"
              onClick={() => setShowBuilder(true)}
              title="Edit avatar"
            >
              <ProfileAvatar
                avatar={avatar}
                size={96}
                fallbackInitials={avatarInitials(draft.gamertag)}
              />
              <span className="xlive-identity__avatar-edit">
                <Sparkles size={14} /> Edit
              </span>
            </button>
            <div className="xlive-identity__main">
              <input
                type="text"
                className="xlive-gamertag-input"
                maxLength={15}
                placeholder="Gamertag"
                value={draft.gamertag}
                onChange={(e) => setDraft((d) => ({ ...d, gamertag: e.target.value }))}
                aria-label="Gamertag"
              />
              <code className="xlive-identity__xuid">{profile.profileKey || profile.liveXuid}</code>
            </div>
          </div>

          {showBuilder && (
            <AvatarBuilder
              initialAvatar={avatar}
              onCancel={() => setShowBuilder(false)}
              onSave={(next) => {
                setAvatar(next);
                setShowBuilder(false);
                setStatusKind('ok');
                setStatus('Avatar updated. Save to apply.');
              }}
            />
          )}

          <div className="xlive-fields">
            <div className="xlive-field">
              <label>Region</label>
              <select
                className="form-select"
                value={draft.country}
                onChange={(e) => setDraft((d) => ({ ...d, country: Number(e.target.value) }))}
              >
                {XBOX_COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="xlive-field">
              <label>Language</label>
              <select
                className="form-select"
                value={draft.language}
                onChange={(e) => setDraft((d) => ({ ...d, language: Number(e.target.value) }))}
              >
                {XBOX_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div className="xlive-field">
              <label>Controller</label>
              <select
                className="form-select"
                value={draft.controllerSlot}
                onChange={(e) => setDraft((d) => ({ ...d, controllerSlot: Number(e.target.value) }))}
              >
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>Player {n + 1}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="xlive-live-card">
            <div className="xlive-live-card__head">
              <div>
                <h4>Xbox Live</h4>
                <p>Online sign-in state in Xenia config</p>
              </div>
              <button
                type="button"
                className={`xlive-toggle${draft.xboxLiveEnabled ? ' is-on' : ''}`}
                onClick={() => setDraft((d) => ({
                  ...d,
                  xboxLiveEnabled: !d.xboxLiveEnabled,
                  signInState: !d.xboxLiveEnabled ? 2 : 1,
                  subscriptionTier: !d.xboxLiveEnabled ? d.subscriptionTier : 0
                }))}
                aria-pressed={draft.xboxLiveEnabled}
              >
                <span className="xlive-toggle__knob" />
              </button>
            </div>
            <div className={`xlive-live-card__tier${draft.xboxLiveEnabled ? '' : ' is-disabled'}`}>
              <label>Subscription</label>
              <select
                className="form-select"
                value={draft.subscriptionTier}
                disabled={!draft.xboxLiveEnabled}
                onChange={(e) => setDraft((d) => ({ ...d, subscriptionTier: Number(e.target.value) }))}
              >
                {SUBSCRIPTION_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="xlive-pin-card">
            <div className="xlive-live-card__head">
              <div>
                <h4><Lock size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Profile PIN</h4>
                <p>{hasPin ? 'Required when selecting this profile.' : 'Optional lock for this profile.'}</p>
              </div>
            </div>
            {!hasPin && pinMode === 'none' && (
              <button type="button" className="boot-btn" onClick={() => setPinMode('set')}>
                Set a PIN
              </button>
            )}
            {hasPin && pinMode === 'none' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="boot-btn" onClick={() => setPinMode('change')}>
                  Change PIN
                </button>
                <button type="button" className="boot-btn boot-btn--ghost" onClick={() => setPinMode('remove')}>
                  Remove PIN
                </button>
              </div>
            )}
            {pinMode !== 'none' && (
              <div className="xlive-pin-fields">
                {hasPin && pinMode !== 'set' && (
                  <label className="boot-label">
                    Current PIN
                    <input
                      type="password"
                      className="boot-input"
                      value={pinDraft.currentPin}
                      onChange={(e) => setPinDraft((d) => ({ ...d, currentPin: e.target.value }))}
                    />
                  </label>
                )}
                {(pinMode === 'set' || pinMode === 'change') && (
                  <>
                    <label className="boot-label">
                      New PIN
                      <input
                        type="password"
                        className="boot-input"
                        value={pinDraft.newPin}
                        onChange={(e) => setPinDraft((d) => ({ ...d, newPin: e.target.value }))}
                      />
                    </label>
                    <label className="boot-label">
                      Confirm PIN
                      <input
                        type="password"
                        className="boot-input"
                        value={pinDraft.confirmPin}
                        onChange={(e) => setPinDraft((d) => ({ ...d, confirmPin: e.target.value }))}
                      />
                    </label>
                  </>
                )}
                <button type="button" className="boot-btn boot-btn--ghost" onClick={() => setPinMode('none')}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          <footer className="xlive-footer">
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={loading}>
              <Save size={15} /> Save
            </button>
            <button type="button" className="xlive-btn-ghost" onClick={handleExport}>
              <Download size={14} /> Export
            </button>
            <button type="button" className="xlive-btn-ghost xlive-btn-ghost--danger" onClick={handleDelete}>
              <Trash2 size={14} /> Delete profile
            </button>
            <button
              type="button"
              className="xlive-btn-ghost"
              onClick={() => window.electronAPI?.openXboxLiveProfileFolder?.(settings.emulatorPath)}
              style={{ marginLeft: 'auto' }}
            >
              <FolderOpen size={14} /> Folder
            </button>
          </footer>
        </>
      )}

      {status && (
        <p className={`xlive-toast${statusKind === 'warn' ? ' xlive-toast--warn' : ''}`}>{status}</p>
      )}
    </div>
  );
};

export default XboxLiveProfilesPanel;
