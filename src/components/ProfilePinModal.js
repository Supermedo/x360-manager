import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import ModalOverlay from './ModalOverlay';

const ProfilePinModal = ({
  profileName,
  title = 'Enter PIN',
  onSubmit,
  onCancel,
  error: externalError
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (pin.length < 4) {
      setError('PIN must be at least 4 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = await onSubmit(pin);
      if (result?.ok === false) {
        setError(result.error || 'Wrong PIN.');
        setPin('');
      }
    } catch (err) {
      setError(err.message || 'Could not verify PIN.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalOverlay onClose={onCancel} ariaLabel={title}>
      <form className="profile-pin-modal" onSubmit={handleSubmit}>
        <Lock size={28} style={{ opacity: 0.7, marginBottom: 12 }} />
        <h2>{title}</h2>
        <p className="profile-pin-modal__sub">{profileName}</p>
        <input
          type="password"
          className="boot-input"
          inputMode="numeric"
          autoComplete="off"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\s/g, ''))}
          maxLength={16}
          autoFocus
        />
        {(error || externalError) && (
          <p className="boot-error">{error || externalError}</p>
        )}
        <div className="profile-pin-modal__actions">
          {onCancel && (
            <button type="button" className="boot-btn boot-btn--ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          )}
          <button type="submit" className="boot-btn boot-btn--primary" disabled={busy}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
};

export default ProfilePinModal;
