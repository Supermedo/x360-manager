import React, { useState } from 'react';
import { Sparkles, UserPlus, X } from 'lucide-react';
import AvatarBuilder from './AvatarBuilder';
import ModalOverlay from './ModalOverlay';
import ProfileAvatar from './ProfileAvatar';
import { DEFAULT_AVATAR_CONFIG, randomAvatarConfig } from '../utils/avatarOptions';

const ProfileAddModal = ({ onCreate, onCancel }) => {
  const [gamertag, setGamertag] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [avatar, setAvatar] = useState({ type: 'builder', config: { ...DEFAULT_AVATAR_CONFIG } });
  const [showBuilder, setShowBuilder] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const tag = gamertag.trim().slice(0, 15) || 'Player';
    if (usePin) {
      if (pin.length < 4) {
        setError('PIN must be at least 4 characters.');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match.');
        return;
      }
    }
    setBusy(true);
    try {
      const result = await onCreate({
        gamertag: tag,
        pin: usePin ? pin : undefined,
        avatar
      });
      if (!result?.ok) {
        setError(result?.error || 'Could not create profile.');
      }
    } catch (err) {
      setError(err.message || 'Could not create profile.');
    } finally {
      setBusy(false);
    }
  };

  if (showBuilder) {
    return (
      <AvatarBuilder
        initialAvatar={avatar}
        onCancel={() => setShowBuilder(false)}
        onSave={(next) => {
          setAvatar(next);
          setShowBuilder(false);
        }}
      />
    );
  }

  return (
    <ModalOverlay onClose={onCancel} ariaLabel="New profile">
      <form className="profile-pin-modal profile-pin-modal--wide" onSubmit={handleSubmit}>
        <button type="button" className="profile-pin-modal__close" onClick={onCancel} aria-label="Close">
          <X size={20} />
        </button>
        <UserPlus size={28} style={{ opacity: 0.7, marginBottom: 12 }} />
        <h2>New profile</h2>

        <div className="profile-add-avatar">
          <ProfileAvatar avatar={avatar} size={96} fallbackInitials="?" />
          <div className="profile-add-avatar__actions">
            <button
              type="button"
              className="boot-btn"
              onClick={() => setShowBuilder(true)}
            >
              <Sparkles size={14} /> Customize avatar
            </button>
            <button
              type="button"
              className="boot-btn boot-btn--ghost"
              onClick={() => setAvatar({ type: 'builder', config: randomAvatarConfig() })}
            >
              Randomize
            </button>
          </div>
        </div>

        <label className="boot-label">
          Gamertag
          <input
            className="boot-input"
            value={gamertag}
            onChange={(e) => setGamertag(e.target.value)}
            maxLength={15}
            placeholder="Player"
            autoFocus
          />
        </label>
        <label className="profile-picker__remember">
          <input type="checkbox" checked={usePin} onChange={(e) => setUsePin(e.target.checked)} />
          Protect with a PIN
        </label>
        {usePin && (
          <>
            <label className="boot-label">
              PIN
              <input
                type="password"
                className="boot-input"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={16}
              />
            </label>
            <label className="boot-label">
              Confirm PIN
              <input
                type="password"
                className="boot-input"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                maxLength={16}
              />
            </label>
          </>
        )}
        {error && <p className="boot-error">{error}</p>}
        <div className="profile-pin-modal__actions">
          <button type="button" className="boot-btn boot-btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="boot-btn boot-btn--primary" disabled={busy}>
            {busy ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
};

export default ProfileAddModal;
