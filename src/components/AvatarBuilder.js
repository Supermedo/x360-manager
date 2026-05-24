import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Shuffle, Sparkles, Upload, X } from 'lucide-react';
import ModalOverlay from './ModalOverlay';
import ProfileAvatar from './ProfileAvatar';
import {
  BACKGROUND_COLORS,
  DEFAULT_AVATAR_CONFIG,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  SHIRT_COLORS,
  SKIN_TONES,
  randomAvatarConfig
} from '../utils/avatarOptions';

const PHOTO_MAX_DIM = 256;

const cropImageToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image.'));
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = PHOTO_MAX_DIM;
        canvas.height = PHOTO_MAX_DIM;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, size, size, 0, 0, PHOTO_MAX_DIM, PHOTO_MAX_DIM);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const Swatch = ({ items, selected, onSelect, type = 'color' }) => (
  <div className="avatar-swatch-grid">
    {items.map((item) => {
      const value = typeof item === 'string' ? item : item.id;
      const color = typeof item === 'string' ? null : item.color;
      const isSelected = selected === value;
      const style = color
        ? color.startsWith('linear-gradient')
          ? { background: color }
          : { background: color }
        : undefined;
      return (
        <button
          key={value}
          type="button"
          className={`avatar-swatch${isSelected ? ' is-selected' : ''}${type === 'label' ? ' avatar-swatch--label' : ''}`}
          style={style}
          onClick={() => onSelect(value)}
          aria-label={value}
          title={value}
        >
          {type === 'label' && <span>{value}</span>}
        </button>
      );
    })}
  </div>
);

const STYLE_SECTIONS = [
  { key: 'skin', label: 'Skin', items: SKIN_TONES, type: 'color' },
  { key: 'hairStyle', label: 'Hair style', items: HAIR_STYLES, type: 'label' },
  { key: 'hairColor', label: 'Hair color', items: HAIR_COLORS, type: 'color' },
  { key: 'eyes', label: 'Eyes', items: EYE_STYLES, type: 'label' },
  { key: 'mouth', label: 'Mouth', items: MOUTH_STYLES, type: 'label' },
  { key: 'shirt', label: 'Shirt', items: SHIRT_COLORS, type: 'color' },
  { key: 'background', label: 'Background', items: BACKGROUND_COLORS, type: 'color' }
];

const AvatarBuilder = ({ initialAvatar, onSave, onCancel }) => {
  const initialMode = initialAvatar?.type === 'photo' ? 'photo' : 'style';
  const [mode, setMode] = useState(initialMode);
  const [config, setConfig] = useState(
    initialAvatar?.type === 'builder' && initialAvatar.config
      ? { ...DEFAULT_AVATAR_CONFIG, ...initialAvatar.config }
      : DEFAULT_AVATAR_CONFIG
  );
  const [photoData, setPhotoData] = useState(
    initialAvatar?.type === 'photo' ? initialAvatar.dataUrl : ''
  );
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image is too large (max 8 MB).');
      return;
    }
    try {
      const dataUrl = await cropImageToDataUrl(file);
      setPhotoData(dataUrl);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load image.');
    }
  };

  const handleSave = () => {
    if (mode === 'photo') {
      if (!photoData) {
        setError('Pick a photo first.');
        return;
      }
      onSave({ type: 'photo', dataUrl: photoData });
      return;
    }
    onSave({ type: 'builder', config });
  };

  const previewAvatar =
    mode === 'photo' && photoData
      ? { type: 'photo', dataUrl: photoData }
      : { type: 'builder', config };

  return (
    <ModalOverlay onClose={onCancel} ariaLabel="Avatar editor">
      <div className="avatar-builder">
        <button type="button" className="profile-pin-modal__close" onClick={onCancel} aria-label="Close">
          <X size={20} />
        </button>

        <header className="avatar-builder__head">
          <Sparkles size={18} />
          <h2>Avatar</h2>
        </header>

        <div className="avatar-builder__tabs">
          <button
            type="button"
            className={`avatar-builder__tab${mode === 'style' ? ' is-active' : ''}`}
            onClick={() => setMode('style')}
          >
            Style
          </button>
          <button
            type="button"
            className={`avatar-builder__tab${mode === 'photo' ? ' is-active' : ''}`}
            onClick={() => setMode('photo')}
          >
            <ImageIcon size={14} /> Photo
          </button>
        </div>

        <div className="avatar-builder__body">
          <aside className="avatar-builder__preview">
            <ProfileAvatar avatar={previewAvatar} size={160} fallbackInitials="?" />
            {mode === 'style' && (
              <button
                type="button"
                className="boot-btn boot-btn--ghost"
                onClick={() => setConfig(randomAvatarConfig())}
              >
                <Shuffle size={14} /> Surprise me
              </button>
            )}
          </aside>

          <div className="avatar-builder__controls">
            {mode === 'style' && STYLE_SECTIONS.map((section) => (
              <div className="avatar-builder__section" key={section.key}>
                <label>{section.label}</label>
                <Swatch
                  items={section.items}
                  selected={config[section.key]}
                  type={section.type}
                  onSelect={(value) => setConfig((c) => ({ ...c, [section.key]: value }))}
                />
              </div>
            ))}

            {mode === 'photo' && (
              <div className="avatar-builder__photo">
                <p className="profile-pin-modal__sub">
                  Photo is cropped to a square and stored locally on this PC.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="boot-btn boot-btn--primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} /> {photoData ? 'Change photo' : 'Choose photo'}
                </button>
                {photoData && (
                  <button
                    type="button"
                    className="boot-btn boot-btn--ghost"
                    onClick={() => setPhotoData('')}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <p className="boot-error">{error}</p>}

        <div className="profile-pin-modal__actions">
          <button type="button" className="boot-btn boot-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="boot-btn boot-btn--primary" onClick={handleSave}>
            Save avatar
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};

export default AvatarBuilder;
