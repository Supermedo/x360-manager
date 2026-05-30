/** Force the Windows .exe icon when electron-builder misses it. */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const fs = require('fs');
  const path = require('path');
  const rcedit = require('rcedit');

  const projectDir = context.packager.projectDir;
  const iconPath = path.join(projectDir, 'resources', 'icon.ico');
  if (!fs.existsSync(iconPath)) {
    console.warn('[afterPack] resources/icon.ico not found');
    return;
  }

  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);

  try {
    await rcedit(exePath, { icon: iconPath });
    console.log(`[afterPack] Applied icon to ${exeName}`);
  } catch (err) {
    console.warn('[afterPack] rcedit failed:', err.message);
  }
};
