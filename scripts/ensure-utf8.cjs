const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const toUtf8IfNeeded = (filePath) => {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 2 || buf[1] !== 0) return false;
  const utf8 = Buffer.from(buf.toString('ucs2'), 'utf8');
  fs.writeFileSync(filePath, utf8);
  return true;
};

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'build') continue;
      walk(full, out);
    } else if (/\.(js|jsx|cjs|mjs|css)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
};

const targets = [
  ...walk(path.join(ROOT, 'src')),
  ...walk(path.join(ROOT, 'scripts')),
  path.join(ROOT, 'xboxLiveProfiles.js'),
  path.join(ROOT, 'accountFile.js'),
  path.join(ROOT, 'xeniaConfig.js'),
  path.join(ROOT, 'xeniaLaunch.js'),
  path.join(ROOT, 'appStorage.js'),
  path.join(ROOT, 'electron.js'),
  path.join(ROOT, 'preload.js')
].filter((p, i, a) => fs.existsSync(p) && a.indexOf(p) === i);

let fixed = 0;
for (const filePath of targets) {
  if (toUtf8IfNeeded(filePath)) {
    fixed += 1;
    console.log('UTF-8 fixed:', path.relative(ROOT, filePath));
  }
}
if (fixed === 0) {
  console.log('All checked source files are already UTF-8.');
}
