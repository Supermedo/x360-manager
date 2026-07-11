const fs = require('fs');
const path = require('path');

const normalizeTitleId = (titleId) => {
  if (!titleId) return null;
  const hex = String(titleId).replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (!hex) return null;
  return hex.padStart(8, '0').slice(-8);
};

const getPatchesDir = (emulatorPath) => path.join(path.dirname(emulatorPath), 'patches');

const listPatchFiles = (patchesDir) => {
  if (!fs.existsSync(patchesDir)) return [];
  return fs.readdirSync(patchesDir).filter((f) => f.endsWith('.toml') || f.endsWith('.patch'));
};

const readTitleIdFromPatchContent = (content) => {
  const match = content.match(/title_id\s*=\s*["']([A-F0-9]{8})["']/i);
  return match ? match[1].toUpperCase() : null;
};

const findPatchFileForTitle = (emulatorPath, titleId) => {
  const normalized = normalizeTitleId(titleId);
  if (!normalized || !emulatorPath) return null;

  const patchesDir = getPatchesDir(emulatorPath);
  const files = listPatchFiles(patchesDir);
  if (files.length === 0) return null;

  const byFilename = files.find((f) => f.toUpperCase().includes(normalized));
  if (byFilename) return path.join(patchesDir, byFilename);

  for (const fileName of files) {
    try {
      const fullPath = path.join(patchesDir, fileName);
      const content = fs.readFileSync(fullPath, 'utf8');
      const fileTitleId = readTitleIdFromPatchContent(content);
      if (fileTitleId === normalized) return fullPath;
    } catch {
      // skip unreadable files
    }
  }

  return null;
};

const parsePatchFile = (patchPath) => {
  const lines = fs.readFileSync(patchPath, 'utf8').split(/\r?\n/);
  const patches = [];
  let currentPatch = null;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line.startsWith('[[patch]]')) {
      if (currentPatch) patches.push(currentPatch);
      currentPatch = {
        id: patches.length,
        enabledLineIndex: -1,
        insertAfterIndex: -1,
        name: 'Unnamed Patch',
        desc: '',
        author: 'Unknown',
        is_enabled: false
      };
      continue;
    }

    if (!currentPatch || line.startsWith('[[patch.')) {
      if (currentPatch && line.startsWith('[[patch.') && currentPatch.enabledLineIndex === -1) {
        currentPatch.insertAfterIndex = i - 1;
      }
      continue;
    }

    if (line.startsWith('name') && line.includes('=')) {
      currentPatch.name = line.substring(line.indexOf('=') + 1).trim().replace(/(^["']|["']$)/g, '');
    } else if (line.startsWith('desc') && line.includes('=')) {
      currentPatch.desc = line.substring(line.indexOf('=') + 1).trim().replace(/(^["']|["']$)/g, '');
    } else if (line.startsWith('author') && line.includes('=')) {
      currentPatch.author = line.substring(line.indexOf('=') + 1).trim().replace(/(^["']|["']$)/g, '');
    } else if ((line.startsWith('is_enabled') || line.startsWith('enabled')) && line.includes('=')) {
      currentPatch.is_enabled = /=\s*true/i.test(line);
      currentPatch.enabledLineIndex = i;
    }
  }

  if (currentPatch) patches.push(currentPatch);
  return { lines, patches };
};

const findPatchBlockStart = (lines, fromIndex) => {
  for (let i = fromIndex; i >= 0; i -= 1) {
    if (lines[i] && lines[i].trim().startsWith('[[patch]]')) return i;
  }
  return -1;
};

const findEnabledLineInBlock = (lines, patchStart) => {
  for (let i = patchStart + 1; i < lines.length; i += 1) {
    const trimmed = lines[i]?.trim() || '';
    if (trimmed.startsWith('[[patch]]')) break;
    if (trimmed.startsWith('[[patch.')) break;
    if (/^\s*(is_enabled|enabled)\s*=/.test(lines[i] || '')) return i;
  }
  return -1;
};

const findInsertIndexInBlock = (lines, patchStart) => {
  let insertAt = patchStart;
  for (let i = patchStart + 1; i < lines.length; i += 1) {
    const trimmed = lines[i]?.trim() || '';
    if (trimmed.startsWith('[[patch]]')) break;
    if (trimmed.startsWith('[[patch.')) return i - 1;
    if (trimmed.startsWith('name') || trimmed.startsWith('desc') || trimmed.startsWith('author')) {
      insertAt = i;
    }
  }
  return insertAt;
};

const togglePatchEnabled = (patchFile, patchId, newValue) => {
  if (!fs.existsSync(patchFile)) {
    return { success: false, error: 'Patch file not found' };
  }

  const { lines, patches } = parsePatchFile(patchFile);
  const patch = patches.find((p) => p.id === patchId);
  if (!patch) {
    return { success: false, error: 'Patch entry not found in file' };
  }

  let targetIndex = patch.enabledLineIndex;

  if (targetIndex < 0 || !lines[targetIndex]?.match(/^\s*(is_enabled|enabled)\s*=/)) {
    const patchStart = findPatchBlockStart(lines, patch.insertAfterIndex >= 0 ? patch.insertAfterIndex : lines.length - 1);
    if (patchStart < 0) {
      return { success: false, error: 'Could not locate patch block in file' };
    }
    targetIndex = findEnabledLineInBlock(lines, patchStart);
    if (targetIndex < 0) {
      const insertAt = findInsertIndexInBlock(lines, patchStart);
      const leading = (lines[insertAt]?.match(/^(\s*)/) || ['', ''])[1];
      lines.splice(insertAt + 1, 0, `${leading}is_enabled = ${newValue ? 'true' : 'false'}`);
      fs.writeFileSync(patchFile, lines.join('\n'), 'utf8');
      return { success: true, inserted: true };
    }
  }

  const existingLine = lines[targetIndex];
  const leadingSpace = (existingLine.match(/^(\s*)/) || ['', ''])[1];
  lines[targetIndex] = `${leadingSpace}is_enabled = ${newValue ? 'true' : 'false'}`;
  fs.writeFileSync(patchFile, lines.join('\n'), 'utf8');
  return { success: true };
};

const countEnabledPatches = (patchFile) => {
  if (!fs.existsSync(patchFile)) return 0;
  const { patches } = parsePatchFile(patchFile);
  return patches.filter((p) => p.is_enabled).length;
};

module.exports = {
  normalizeTitleId,
  getPatchesDir,
  findPatchFileForTitle,
  parsePatchFile,
  togglePatchEnabled,
  countEnabledPatches
};
