const LEGACY_KEYS = {
  settings: 'x360-settings',
  games: 'x360-games',
  xeniaProfiles: 'x360-xenia-profiles'
};

export const loadPersisted = async (key, fallback = null) => {
  if (window.electronAPI?.storageGet) {
    try {
      const fromDisk = await window.electronAPI.storageGet(key);
      if (fromDisk !== null && fromDisk !== undefined) {
        return fromDisk;
      }
    } catch (err) {
      console.warn(`[storage] disk read ${key}:`, err);
    }
  }

  const legacyKey = LEGACY_KEYS[key];
  if (legacyKey) {
    try {
      const raw = localStorage.getItem(legacyKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (window.electronAPI?.storageSet) {
          window.electronAPI.storageSet(key, parsed).catch((err) => {
            console.warn(`[storage] migrate ${key} to disk:`, err);
          });
        }
        return parsed;
      }
    } catch (err) {
      console.warn(`[storage] localStorage read ${key}:`, err);
    }
  }

  return fallback;
};

export const savePersisted = async (key, data) => {
  if (window.electronAPI?.storageSet) {
    try {
      await window.electronAPI.storageSet(key, data);
    } catch (err) {
      console.warn(`[storage] disk write ${key}:`, err);
    }
  }

  const legacyKey = LEGACY_KEYS[key];
  if (legacyKey) {
    try {
      localStorage.setItem(legacyKey, JSON.stringify(data));
    } catch (err) {
      console.warn(`[storage] localStorage write ${key}:`, err);
    }
  }
};
