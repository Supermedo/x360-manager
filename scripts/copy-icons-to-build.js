const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');
const resourcesDir = path.join(root, 'resources');

if (!fs.existsSync(buildDir)) {
  console.warn('[icons] build/ missing — skip copy');
  process.exit(0);
}

for (const name of ['icon.ico', 'icon.png']) {
  const src = path.join(resourcesDir, name);
  const dest = path.join(buildDir, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[icons] copied ${name} → build/`);
  }
}
