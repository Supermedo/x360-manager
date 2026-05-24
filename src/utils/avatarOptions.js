export const SKIN_TONES = [
  { id: 'light', color: '#f4d3b4' },
  { id: 'fair', color: '#e0b59a' },
  { id: 'tan', color: '#c89070' },
  { id: 'medium', color: '#a86b4c' },
  { id: 'dark', color: '#7a4a30' },
  { id: 'deep', color: '#4d2d1c' }
];

export const HAIR_COLORS = [
  { id: 'black', color: '#1a1a1a' },
  { id: 'brown', color: '#4a2c1a' },
  { id: 'auburn', color: '#7a3a1a' },
  { id: 'blonde', color: '#d4b075' },
  { id: 'red', color: '#a83a1a' },
  { id: 'gray', color: '#8a8a8a' },
  { id: 'platinum', color: '#e8d8b8' },
  { id: 'green', color: '#3aa83a' },
  { id: 'blue', color: '#3a6aa8' },
  { id: 'pink', color: '#e88ab0' }
];

export const SHIRT_COLORS = [
  { id: 'green', color: '#107c10' },
  { id: 'red', color: '#c8102e' },
  { id: 'blue', color: '#1e5db8' },
  { id: 'purple', color: '#7a3aa8' },
  { id: 'orange', color: '#e87a10' },
  { id: 'pink', color: '#e88ab0' },
  { id: 'teal', color: '#0a9aa0' },
  { id: 'gray', color: '#4a4a4a' },
  { id: 'white', color: '#f0f0f0' },
  { id: 'yellow', color: '#e8c810' }
];

export const BACKGROUND_COLORS = [
  { id: 'green', color: '#107c10' },
  { id: 'dark', color: '#1f1f1f' },
  { id: 'navy', color: '#0a2540' },
  { id: 'red', color: '#7a1a2a' },
  { id: 'purple', color: '#3a1a5a' },
  { id: 'teal', color: '#0a4a4a' },
  { id: 'gradient1', color: 'linear-gradient(135deg,#107c10,#0a4020)' },
  { id: 'gradient2', color: 'linear-gradient(135deg,#1e5db8,#0a2540)' },
  { id: 'gradient3', color: 'linear-gradient(135deg,#7a3aa8,#3a1a5a)' }
];

export const HAIR_STYLES = ['short', 'long', 'spiky', 'mohawk', 'ponytail', 'bald', 'cap', 'beanie'];

export const EYE_STYLES = ['normal', 'happy', 'wink', 'glasses', 'sunglasses'];

export const MOUTH_STYLES = ['smile', 'grin', 'neutral', 'smirk', 'surprised'];

export const DEFAULT_AVATAR_CONFIG = {
  skin: 'fair',
  hairStyle: 'short',
  hairColor: 'brown',
  eyes: 'normal',
  mouth: 'smile',
  shirt: 'green',
  background: 'green'
};

const findColor = (palette, id, fallback) => {
  const entry = palette.find((p) => p.id === id);
  return entry ? entry.color : fallback;
};

export const resolveAvatarColors = (config = {}) => {
  const cfg = { ...DEFAULT_AVATAR_CONFIG, ...config };
  return {
    skin: findColor(SKIN_TONES, cfg.skin, '#e0b59a'),
    hair: findColor(HAIR_COLORS, cfg.hairColor, '#4a2c1a'),
    shirt: findColor(SHIRT_COLORS, cfg.shirt, '#107c10'),
    background: findColor(BACKGROUND_COLORS, cfg.background, '#107c10'),
    hairStyle: cfg.hairStyle,
    eyes: cfg.eyes,
    mouth: cfg.mouth
  };
};

export const randomAvatarConfig = () => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return {
    skin: pick(SKIN_TONES).id,
    hairStyle: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS).id,
    eyes: pick(EYE_STYLES),
    mouth: pick(MOUTH_STYLES),
    shirt: pick(SHIRT_COLORS).id,
    background: pick(BACKGROUND_COLORS).id
  };
};
