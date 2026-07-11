/**
 * DashX360-inspired channel and tile configuration.
 * Visual assets from DashX360 by ZivvoZ (used with credit): https://github.com/ZivvoZ/dashx360
 */
const asset = (path) => `${process.env.PUBLIC_URL || '.'}/metro/dashx360/${path}`;

/** Xbox 360 hub grid base size @ 1080p — used for viewport scaling */
export const HUB_BASE = {
  slot: 248,
  wide: 496,
  gap: 5,
  get width() {
    return this.slot + this.gap + this.wide + this.gap + this.slot;
  },
  get height() {
    return this.slot + this.gap + this.slot;
  }
};

export const METRO_CHANNELS = [
  { id: 'search', label: 'search', layout: 'search', background: asset('themes/halo/games.png') },
  { id: 'home', label: 'home', layout: 'home-dashboard', background: asset('themes/halo/home.png') },
  { id: 'games', label: 'games', layout: 'games-hub', background: asset('themes/halo/games.png') },
  { id: 'settings', label: 'settings', layout: 'settings-grid', background: asset('themes/halo/settings.png') }
];

/** Settings blade — 4×2 green tile grid @ 1080p */
export const SETTINGS_GRID_BASE = {
  tile: 248,
  gap: 5,
  cols: 4,
  rows: 2,
  get width() {
    return this.cols * this.tile + (this.cols - 1) * this.gap;
  },
  get height() {
    return this.rows * this.tile + (this.rows - 1) * this.gap;
  }
};

export const SETTINGS_BLADE_TILES = [
  { id: 'system', label: 'System', image: asset('settings-icons/system.png'), action: 'openSettingsTab', settingsTab: 'system', focusId: 0 },
  { id: 'preferences', label: 'Preferences', image: asset('settings-icons/preferences.png'), action: 'openSettingsTab', settingsTab: 'interface', focusId: 1 },
  { id: 'profile', label: 'Profile', image: asset('settings-icons/account.png'), action: 'switchProfile', focusId: 2 },
  { id: 'kinect', label: 'Kinect', image: asset('settings-icons/kinect.png'), disabled: true, focusId: 3 },
  { id: 'account', label: 'Account', image: asset('settings-icons/account.png'), action: 'openProfileEditor', focusId: 4 },
  { id: 'privacy', label: 'Privacy', image: asset('settings-icons/privacy.png'), disabled: true, focusId: 5 },
  { id: 'family', label: 'Family', image: asset('settings-icons/family.png'), disabled: true, focusId: 6 },
  { id: 'turnoff', label: 'Turn Off', image: asset('settings-icons/turnoff.png'), action: 'exit', focusId: 7 }
];

/** 4×2 focus navigation for settings blade */
export const SETTINGS_GRID_NAV = {
  0: { right: 1, down: 4 },
  1: { left: 0, right: 2, down: 5 },
  2: { left: 1, right: 3, down: 6 },
  3: { left: 2, down: 7 },
  4: { up: 0, right: 5 },
  5: { up: 1, left: 4, right: 6 },
  6: { up: 2, left: 5, right: 7 },
  7: { up: 3, left: 6 }
};

/** Xbox 360 Games channel hub grid */
export const GAMES_HUB_TILES = {
  myGames: {
    id: 'my-games',
    label: 'My Games',
    image: asset('tiles/mygames.png'),
    type: 'hub',
    action: 'openLibrary',
    focusId: 0
  },
  settings: {
    id: 'hub-settings',
    label: 'Settings',
    image: asset('settings-icons/preferences.png'),
    type: 'hub',
    action: 'openSettingsChannel',
    focusId: 1,
    appTile: true
  },
  featuredFallback: {
    id: 'featured-fallback',
    label: 'Forza Horizon',
    image: asset('tiles/forzahorizongames.jpg'),
    type: 'static',
    focusId: 2
  },
  slot1Fallback: {
    id: 'slot1-fallback',
    label: 'Minecraft',
    image: asset('tiles/minecraftgames.jpg'),
    type: 'static',
    focusId: 3
  },
  slot2Fallback: {
    id: 'slot2-fallback',
    label: 'Black Ops II',
    image: asset('tiles/blackops2games.jpg'),
    type: 'static',
    focusId: 4
  }
};

/** 2D focus navigation for games hub grid */
export const GAMES_HUB_NAV = {
  0: { right: 2, down: 1 },
  1: { up: 0, right: 2 },
  2: { left: 0, right: 3, down: 4 },
  3: { left: 2, down: 4 },
  4: { up: 3, left: 2 }
};

/** Home hub — 4 tiles only (no bottom-left app slot): list, last played, favorite, most played */
export const HOME_HUB_NAV = {
  0: { right: 2, down: 4 },
  2: { left: 0, right: 3, down: 4 },
  3: { left: 2, down: 4 },
  4: { up: 2, left: 0 }
};

export const HOME_TILES = [
  { id: 'library', label: 'My Games', image: asset('tiles/mygames.png'), action: 'openLibrary' },
  { id: 'settings', label: 'Settings', image: asset('settings-icons/preferences.png'), action: 'openSettings', appTile: true },
  { id: 'profile', label: 'Switch Profile', image: asset('settings-icons/account.png'), action: 'switchProfile', appTile: true },
  { id: 'setup', label: 'App Settings', image: asset('settings-icons/system.png'), action: 'openSettings', appTile: true }
];

export const SETTINGS_TILES = [
  { id: 'preferences', label: 'App Settings', image: asset('settings-icons/preferences.png'), action: 'openSettings', appTile: true },
  { id: 'profile', label: 'Switch Profile', image: asset('settings-icons/account.png'), action: 'switchProfile', appTile: true },
  { id: 'exit', label: 'Exit Console Mode', image: asset('settings-icons/turnoff.png'), action: 'exit' }
];

export const DEFAULT_AVATAR = asset('profile/profilepicture.jpg');

export const BOOT_SCREEN_VIDEO = asset('boot/boot-screen.mp4');
export const STARTUP_SOUND = asset('audio/startup.mp3');

export const METRO_SOUNDS = {
  left: asset('audio/08. Page Left.mp3'),
  right: asset('audio/09. Page Right.mp3'),
  select: asset('audio/10. Select A.mp3'),
  back: asset('audio/14. Back.mp3')
};
