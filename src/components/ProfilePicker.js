import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { SettingsContext } from '../context/SettingsContext';
import ProfilePinModal from './ProfilePinModal';
import ProfileAddModal from './ProfileAddModal';
import ProfileAvatar from './ProfileAvatar';
import useGamepad from '../hooks/useGamepad';

const avatarColor = (key) => {
  const palette = ['#107c10', '#0e6b0e', '#1a8f1a', '#2d6a4f', '#40916c', '#52b788'];
  let hash = 0;
  const s = String(key || 'u');
  for (let i = 0; i < s.length; i += 1) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const initials = (tag) => {
  const t = (tag || 'U').trim();
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  return t.slice(0, 1).toUpperCase();
};

const ProfilePicker = ({ onSelect, onCancel, allowAdd = false }) => {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(null);
  const [askEachTime, setAskEachTime] = useState(settings.askProfileOnLaunch !== false);
  const [pinProfile, setPinProfile] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const load = useCallback(async () => {
    if (!settings.emulatorPath) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await window.electronAPI?.listXboxLiveProfiles?.(settings.emulatorPath);
    setProfiles(result?.profiles || []);
    setLoading(false);
  }, [settings.emulatorPath]);

  useEffect(() => {
    load();
  }, [load]);

  const pickerItems = useMemo(() => {
    const items = profiles.map((p) => ({ type: 'profile', profile: p }));
    if (allowAdd) items.push({ type: 'add' });
    return items;
  }, [allowAdd, profiles]);

  useEffect(() => {
    if (focusIndex >= pickerItems.length) {
      setFocusIndex(Math.max(0, pickerItems.length - 1));
    }
  }, [focusIndex, pickerItems.length]);

  const activateProfile = async (profile) => {
    setPicking(profile.id);
    updateSettings({
      sessionXboxLiveProfileId: profile.id,
      activeXboxLiveProfileId: profile.id,
      sessionGamertag: profile.gamertag || 'User',
      sessionAvatar: profile.avatar || null,
      askProfileOnLaunch: askEachTime
    });
    await window.electronAPI?.saveXboxLiveProfile?.(settings.emulatorPath, profile, true);
    setPicking(null);
    onSelect(profile);
  };

  const handlePick = (profile) => {
    if (profile.hasPin) {
      setPinProfile(profile);
      return;
    }
    activateProfile(profile);
  };

  const activateFocused = useCallback(() => {
    const item = pickerItems[focusIndex];
    if (!item || picking) return;
    if (item.type === 'add') {
      setShowAdd(true);
      return;
    }
    const profile = item.profile;
    if (profile.hasPin) {
      setPinProfile(profile);
      return;
    }
    activateProfile(profile);
  }, [focusIndex, pickerItems, picking]);

  const handleCreate = async (options) => {
    const result = await window.electronAPI?.createXboxLiveProfile?.(settings.emulatorPath, options);
    if (result?.ok) {
      setShowAdd(false);
      await load();
      await activateProfile(result.profile);
    }
    return result;
  };

  useGamepad({
    left: () => setFocusIndex((i) => Math.max(0, i - 1)),
    right: () => setFocusIndex((i) => Math.min(pickerItems.length - 1, i + 1)),
    confirm: activateFocused,
    back: () => onCancel?.()
  }, !loading && !showAdd && !pinProfile && pickerItems.length > 0, 250);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (loading || showAdd || pinProfile || pickerItems.length === 0) return;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          setFocusIndex((i) => Math.max(0, i - 1));
          break;
        case 'ArrowRight':
          event.preventDefault();
          setFocusIndex((i) => Math.min(pickerItems.length - 1, i + 1));
          break;
        case 'Enter':
          event.preventDefault();
          activateFocused();
          break;
        case 'Escape':
        case 'Backspace':
          event.preventDefault();
          onCancel?.();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activateFocused, loading, onCancel, pinProfile, pickerItems.length, showAdd]);

  if (showAdd) {
    return (
      <ProfileAddModal
        onCreate={handleCreate}
        onCancel={() => setShowAdd(false)}
      />
    );
  }

  if (pinProfile) {
    return (
      <div className="boot-screen profile-picker">
        <ProfilePinModal
          profileName={pinProfile.gamertag || 'User'}
          onCancel={() => setPinProfile(null)}
          onSubmit={async (pin) => {
            const result = await window.electronAPI?.verifyXboxLiveProfilePin?.(
              settings.emulatorPath,
              pinProfile.profileKey,
              pin
            );
            if (!result?.ok) return result;
            setPinProfile(null);
            await activateProfile(pinProfile);
            return { ok: true };
          }}
        />
      </div>
    );
  }

  return (
    <div className="boot-screen profile-picker">
      <div className="profile-picker__content">
        <h1 className="profile-picker__title">Who&apos;s playing?</h1>

        {loading ? (
          <p className="profile-picker__hint">Loading profiles…</p>
        ) : (
          <div className="profile-picker__grid">
            {profiles.map((p, index) => (
              <button
                key={p.id}
                type="button"
                className={`profile-picker__card${index === focusIndex ? ' is-focused' : ''}`}
                disabled={Boolean(picking)}
                onClick={() => { setFocusIndex(index); handlePick(p); }}
              >
                <span className="profile-picker__avatar profile-picker__avatar--rendered">
                  <ProfileAvatar
                    avatar={p.avatar}
                    size={96}
                    fallbackInitials={initials(p.gamertag)}
                    fallbackColor={avatarColor(p.profileKey || p.id)}
                  />
                </span>
                <span className="profile-picker__name">{p.gamertag || 'User'}</span>
                {p.hasPin && <span className="profile-picker__lock" title="PIN protected">PIN</span>}
              </button>
            ))}

            {allowAdd && (
              <button
                type="button"
                className={`profile-picker__card profile-picker__card--add${focusIndex === profiles.length ? ' is-focused' : ''}`}
                onClick={() => { setFocusIndex(profiles.length); setShowAdd(true); }}
                disabled={Boolean(picking)}
              >
                <span className="profile-picker__avatar profile-picker__avatar--add">
                  <UserPlus size={28} />
                </span>
                <span className="profile-picker__name">Add profile</span>
              </button>
            )}
          </div>
        )}

        <label className="profile-picker__remember">
          <input
            type="checkbox"
            checked={askEachTime}
            onChange={(e) => setAskEachTime(e.target.checked)}
          />
          Ask who&apos;s playing each time I open the app
        </label>

        {onCancel && (
          <button type="button" className="boot-btn boot-btn--ghost profile-picker__cancel" onClick={onCancel}>
            Cancel
          </button>
        )}

        {!loading && pickerItems.length > 0 && (
          <p className="profile-picker__hint">
            ← → Move · A Select · B Back
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfilePicker;
