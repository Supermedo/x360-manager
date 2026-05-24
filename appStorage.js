const fs = require('fs');
const path = require('path');

const STORAGE_FILES = {
  settings: 'app-settings.json',
  games: 'games-library.json',
  xeniaProfiles: 'xenia-profiles-custom.json'
};

const getFilePath = (userDataPath, key) => {
  const name = STORAGE_FILES[key];
  if (!name) throw new Error(`Unknown storage key: ${key}`);
  return path.join(userDataPath, name);
};

const readJson = (userDataPath, key, fallback = null) => {
  const filePath = getFilePath(userDataPath, key);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`[appStorage] Failed to read ${key}:`, err.message);
    return fallback;
  }
};

const writeJson = (userDataPath, key, data) => {
  const filePath = getFilePath(userDataPath, key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
  return { ok: true, path: filePath };
};

module.exports = {
  STORAGE_FILES,
  readJson,
  writeJson
};
