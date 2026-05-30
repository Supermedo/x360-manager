/**
 * Build Windows installer to a temp folder, then copy into dist-setup/.
 * Avoids "app.asar in use" when dist-setup/win-unpacked is locked by a running app.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const version = require(path.join(root, 'package.json')).version;
const tempOut = path.join(root, 'dist-build-temp');
const finalOut = path.join(root, 'dist-setup');
const exeName = `X360-Manager-Setup-${version}.exe`;

execSync('npx electron-builder --win nsis --publish never --config.directories.output=dist-build-temp', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env }
});

if (!fs.existsSync(finalOut)) {
  fs.mkdirSync(finalOut, { recursive: true });
}

for (const name of [exeName, `${exeName}.blockmap`, 'latest.yml']) {
  const src = path.join(tempOut, name);
  const dest = path.join(finalOut, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[dist] Updated ${dest}`);
  }
}

const buildInfo = [
  `X360 Manager v${version}`,
  `Built: ${new Date().toISOString()}`,
  `Installer: ${exeName}`,
  'Includes: auto-update check via GitHub Releases (latest.yml)'
].join('\n');
fs.writeFileSync(path.join(finalOut, 'BUILD_INFO.txt'), buildInfo, 'utf8');

console.log(`[dist] Done. Install: ${path.join(finalOut, exeName)}`);
