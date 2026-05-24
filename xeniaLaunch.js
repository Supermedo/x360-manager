const fs = require('fs');
const path = require('path');

const STFS_MAGIC = new Set(['CON ', 'LIVE', 'PIRS']);

const readFileMagic = (filePath) => {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return buf.toString('ascii');
  } catch {
    return '';
  }
};

const isTitleIdFolderName = (name) => /^[0-9A-Fa-f]{8}$/.test(String(name || '').trim());

const detectArcadeGame = (gamePath) => {
  if (!gamePath || !fs.existsSync(gamePath)) return false;

  let stat;
  try {
    stat = fs.statSync(gamePath);
  } catch {
    return false;
  }

  if (!stat.isFile()) {
    const defaultXex = path.join(gamePath, 'default.xex');
    return fs.existsSync(defaultXex);
  }

  const base = path.basename(gamePath).toLowerCase();
  const ext = path.extname(gamePath).toLowerCase();
  const parentDir = path.basename(path.dirname(gamePath));

  if (base === 'default.xex') return true;
  if (!ext) return true;

  const magic = readFileMagic(gamePath);
  if (STFS_MAGIC.has(magic)) return true;

  if (ext === '.xex' && isTitleIdFolderName(parentDir)) return true;
  if (
    ext === '.xex' &&
    stat.size < 80 * 1024 * 1024 &&
    isTitleIdFolderName(path.basename(path.dirname(path.dirname(gamePath))))
  ) {
    return true;
  }

  return false;
};

const findArcadeFileInDirectory = (dirPath) => {
  const defaultXex = path.join(dirPath, 'default.xex');
  if (fs.existsSync(defaultXex)) {
    return defaultXex;
  }

  let entries;
  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    return null;
  }

  for (const name of entries) {
    const full = path.join(dirPath, name);
    let childStat;
    try {
      childStat = fs.statSync(full);
    } catch {
      continue;
    }
    if (!childStat.isFile()) continue;
    if (detectArcadeGame(full)) return full;
  }

  return null;
};

const resolveXeniaLaunchTarget = (gamePath, emulatorPath) => {
  const emuDir = path.dirname(emulatorPath || '');
  if (!gamePath) {
    return { targetPath: gamePath, cwd: emuDir, isArcade: false };
  }

  let stat;
  try {
    stat = fs.statSync(gamePath);
  } catch {
    return { targetPath: gamePath, cwd: emuDir, isArcade: false };
  }

  if (stat.isDirectory()) {
    const arcadeFile = findArcadeFileInDirectory(gamePath);
    if (arcadeFile) {
      return {
        targetPath: arcadeFile,
        cwd: emuDir,
        isArcade: true
      };
    }
    return { targetPath: gamePath, cwd: gamePath, isArcade: false };
  }

  const isArcade = detectArcadeGame(gamePath);

  return {
    targetPath: gamePath,
    cwd: emuDir,
    isArcade
  };
};

module.exports = {
  detectArcadeGame,
  resolveXeniaLaunchTarget
};
