import { useCallback, useContext, useEffect, useState } from 'react';
import { SettingsContext } from '../context/SettingsContext';

export const emptyProfileDraft = () => ({
  gamertag: 'User',
  country: 0,
  language: 0,
  xboxLiveEnabled: false,
  subscriptionTier: 0,
  signInState: 1,
  controllerSlot: 0,
  maxSignedProfiles: 1
});

export const avatarInitials = (tag) => {
  const t = (tag || 'User').trim();
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  return t.slice(0, 1).toUpperCase() || 'U';
};

export const useXboxLiveProfileEditor = ({ onSwitchProfile } = {}) => {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(emptyProfileDraft());
  const [hasPin, setHasPin] = useState(false);
  const [avatar, setAvatar] = useState(null);
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

  const handleSave = useCallback(async () => {
    if (!profile) return false;
    setStatus('');
    setStatusKind('ok');

    let pinFields;
    if (pinMode === 'set' || pinMode === 'change') {
      if (pinDraft.newPin.length < 4) {
        setStatusKind('warn');
        setStatus('PIN must be at least 4 characters.');
        return false;
      }
      if (pinDraft.newPin !== pinDraft.confirmPin) {
        setStatusKind('warn');
        setStatus('PINs do not match.');
        return false;
      }
      pinFields = {
        newPin: pinDraft.newPin,
        currentPin: hasPin ? pinDraft.currentPin : undefined
      };
      if (hasPin && !pinDraft.currentPin) {
        setStatusKind('warn');
        setStatus('Enter your current PIN.');
        return false;
      }
    } else if (pinMode === 'remove') {
      if (!pinDraft.currentPin) {
        setStatusKind('warn');
        setStatus('Enter your current PIN to remove it.');
        return false;
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
      return true;
    }
    setStatusKind('warn');
    setStatus(result?.error || 'Save failed.');
    return false;
  }, [avatar, draft, hasPin, loadMyProfile, pinDraft, pinMode, profile, settings.emulatorPath, updateSettings]);

  const handleDelete = useCallback(async () => {
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
  }, [hasPin, onSwitchProfile, pinDraft.currentPin, profile, settings.emulatorPath, updateSettings]);

  const handleExport = useCallback(async () => {
    if (!profile?.filePath) return;
    const result = await window.electronAPI?.exportXboxLiveProfile?.(profile.filePath);
    if (result?.ok) {
      setStatusKind('ok');
      setStatus(`Exported to ${result.path}`);
    } else if (!result?.cancelled) {
      setStatusKind('warn');
      setStatus(result?.error || 'Export failed.');
    }
  }, [profile?.filePath]);

  const openProfileFolder = useCallback(() => {
    window.electronAPI?.openXboxLiveProfileFolder?.(settings.emulatorPath);
  }, [settings.emulatorPath]);

  return {
    sessionId,
    profile,
    draft,
    setDraft,
    hasPin,
    avatar,
    setAvatar,
    pinDraft,
    setPinDraft,
    pinMode,
    setPinMode,
    status,
    statusKind,
    loading,
    loadMyProfile,
    handleSave,
    handleDelete,
    handleExport,
    openProfileFolder
  };
};
