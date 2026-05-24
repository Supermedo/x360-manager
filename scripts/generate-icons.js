const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const srcPng = path.join(root, 'public', 'icon.png');
const faviconSvg = path.join(root, 'public', 'favicon.svg');
const buildDir = path.join(root, 'build');
const publicDir = path.join(root, 'public');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const writeSquarePng = async (input, outPath, size = 256) => {
  await sharp(input)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(outPath);
};

(async () => {
  ensureDir(buildDir);
  ensureDir(publicDir);

  let source = srcPng;
  if (!fs.existsSync(source) && fs.existsSync(faviconSvg)) {
    source = path.join(buildDir, '_from-svg.png');
    await sharp(faviconSvg).resize(512, 512).png().toFile(source);
  }

  if (!fs.existsSync(source)) {
    console.error('Missing public/icon.png (or public/favicon.svg)');
    process.exit(1);
  }

  const tempPng = path.join(buildDir, '_icon-temp.png');
  const publicOut = path.join(publicDir, 'icon.png');
  const buildPng = path.join(buildDir, 'icon.png');
  await writeSquarePng(source, tempPng, 256);
  fs.copyFileSync(tempPng, publicOut);
  fs.copyFileSync(tempPng, buildPng);
  try {
    fs.unlinkSync(tempPng);
  } catch {
    // ignore
  }

  try {
    const pngToIco = require('png-to-ico');
    const ico = await pngToIco([buildPng]);
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);
    console.log('Generated public/icon.png, build/icon.png, build/icon.ico');
  } catch (err) {
    console.warn('ICO generation failed:', err.message);
  }
})();
