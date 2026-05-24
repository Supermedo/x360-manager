import React from 'react';
import { resolveAvatarColors } from '../utils/avatarOptions';

const renderHair = (style, color) => {
  switch (style) {
    case 'bald':
      return null;
    case 'long':
      return (
        <g>
          <path d="M28 56 Q28 30 64 28 Q100 30 100 56 L100 92 L92 92 L92 60 Q92 50 64 50 Q36 50 36 60 L36 92 L28 92 Z" fill={color} />
        </g>
      );
    case 'spiky':
      return (
        <g fill={color}>
          <polygon points="40,42 46,18 52,42" />
          <polygon points="50,42 58,12 66,42" />
          <polygon points="62,42 70,14 78,42" />
          <polygon points="74,42 82,20 88,42" />
          <path d="M34 50 Q34 38 64 36 Q94 38 94 50 L94 56 L34 56 Z" />
        </g>
      );
    case 'mohawk':
      return (
        <g fill={color}>
          <path d="M56 12 L72 12 L70 50 L58 50 Z" />
          <path d="M34 56 Q34 50 50 50 L78 50 Q94 50 94 56 L94 60 L34 60 Z" />
        </g>
      );
    case 'ponytail':
      return (
        <g fill={color}>
          <path d="M34 56 Q34 30 64 28 Q94 30 94 56 L94 62 L34 62 Z" />
          <ellipse cx="96" cy="70" rx="6" ry="14" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M30 50 Q30 28 64 26 Q98 28 98 50 L98 56 L30 56 Z" fill={color} />
          <ellipse cx="64" cy="56" rx="42" ry="6" fill={color} />
          <path d="M104 54 Q120 56 118 64 L100 60 Z" fill={color} />
        </g>
      );
    case 'beanie':
      return (
        <g>
          <path d="M28 56 Q28 24 64 22 Q100 24 100 56 Z" fill={color} />
          <rect x="28" y="52" width="72" height="10" rx="3" fill={color} opacity="0.7" />
        </g>
      );
    case 'short':
    default:
      return (
        <path d="M32 56 Q32 30 64 28 Q96 30 96 56 L96 60 L32 60 Z" fill={color} />
      );
  }
};

const renderEyes = (style) => {
  switch (style) {
    case 'happy':
      return (
        <g fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round">
          <path d="M48 70 Q52 66 56 70" />
          <path d="M72 70 Q76 66 80 70" />
        </g>
      );
    case 'wink':
      return (
        <g>
          <circle cx="52" cy="70" r="3" fill="#1a1a1a" />
          <path d="M72 70 Q76 66 80 70" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'glasses':
      return (
        <g>
          <circle cx="52" cy="70" r="2.5" fill="#1a1a1a" />
          <circle cx="76" cy="70" r="2.5" fill="#1a1a1a" />
          <g fill="none" stroke="#1a1a1a" strokeWidth="2">
            <circle cx="52" cy="70" r="8" />
            <circle cx="76" cy="70" r="8" />
            <line x1="60" y1="70" x2="68" y2="70" />
          </g>
        </g>
      );
    case 'sunglasses':
      return (
        <g>
          <rect x="42" y="64" width="20" height="12" rx="3" fill="#1a1a1a" />
          <rect x="66" y="64" width="20" height="12" rx="3" fill="#1a1a1a" />
          <line x1="62" y1="70" x2="66" y2="70" stroke="#1a1a1a" strokeWidth="2" />
        </g>
      );
    case 'normal':
    default:
      return (
        <g fill="#1a1a1a">
          <circle cx="52" cy="70" r="3" />
          <circle cx="76" cy="70" r="3" />
        </g>
      );
  }
};

const renderMouth = (style) => {
  switch (style) {
    case 'grin':
      return (
        <g>
          <path d="M52 86 Q64 96 76 86 L76 88 Q64 98 52 88 Z" fill="#1a1a1a" />
          <rect x="54" y="86" width="20" height="3" fill="#fff" />
        </g>
      );
    case 'neutral':
      return <line x1="56" y1="88" x2="72" y2="88" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />;
    case 'smirk':
      return <path d="M56 88 Q66 92 74 86" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />;
    case 'surprised':
      return <ellipse cx="64" cy="88" rx="4" ry="5" fill="#1a1a1a" />;
    case 'smile':
    default:
      return <path d="M54 86 Q64 94 74 86" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />;
  }
};

const isGradient = (value) => typeof value === 'string' && value.startsWith('linear-gradient');

const parseGradient = (value) => {
  const match = value.match(/linear-gradient\(([^,]+),([^,]+),([^)]+)\)/);
  if (!match) return null;
  return {
    angle: match[1].trim(),
    stops: [match[2].trim(), match[3].trim()]
  };
};

const AvatarSvg = ({ config, size = 128 }) => {
  const colors = resolveAvatarColors(config);
  const gradient = isGradient(colors.background) ? parseGradient(colors.background) : null;
  const gradientId = `avatar-bg-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: '50%' }}
    >
      <defs>
        {gradient && (
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradient.stops[0]} />
            <stop offset="100%" stopColor={gradient.stops[1]} />
          </linearGradient>
        )}
      </defs>
      <rect width="128" height="128" fill={gradient ? `url(#${gradientId})` : colors.background} />
      <path d="M16 128 Q16 100 40 92 L88 92 Q112 100 112 128 Z" fill={colors.shirt} />
      <ellipse cx="64" cy="74" rx="32" ry="36" fill={colors.skin} />
      <ellipse cx="48" cy="82" rx="3" ry="2" fill={colors.skin} opacity="0.6" />
      <ellipse cx="80" cy="82" rx="3" ry="2" fill={colors.skin} opacity="0.6" />
      {renderHair(colors.hairStyle, colors.hair)}
      {renderEyes(colors.eyes)}
      {renderMouth(colors.mouth)}
    </svg>
  );
};

const ProfileAvatar = ({ avatar, size = 64, fallbackInitials, fallbackColor }) => {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  if (avatar?.type === 'photo' && avatar.dataUrl) {
    return (
      <div
        className="profile-avatar profile-avatar--photo"
        style={{ width: dimension, height: dimension }}
      >
        <img src={avatar.dataUrl} alt="" />
      </div>
    );
  }

  if (avatar?.type === 'builder' && avatar.config) {
    return (
      <div
        className="profile-avatar profile-avatar--builder"
        style={{ width: dimension, height: dimension }}
      >
        <AvatarSvg config={avatar.config} size={typeof size === 'number' ? size : 64} />
      </div>
    );
  }

  return (
    <div
      className="profile-avatar profile-avatar--initials"
      style={{
        width: dimension,
        height: dimension,
        background: fallbackColor || '#107c10',
        fontSize: typeof size === 'number' ? `${Math.max(12, size * 0.4)}px` : '1rem'
      }}
    >
      {fallbackInitials || '?'}
    </div>
  );
};

export { AvatarSvg };
export default ProfileAvatar;
