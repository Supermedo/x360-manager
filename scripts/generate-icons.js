const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const faviconSvg = path.join(root, 'public', 'favicon.svg');
const srcPng = path.join(root, 'public', 'icon.png');
const resourcesDir = path.join(root, 'resources');
const publicDir = path.join(root, 'public');

const ICO_SIZES = [256, 128, 64, 48, 32, 16];

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const loadSourceBuffer = async () => {
  if (fs.existsSync(faviconSvg)) {
    return sharp(faviconSvg)
      .resize(512, 512, { fit: 'contain', background: { r: 15, g: 123, b: 15, alpha: 255 } })
      .png()
      .toBuffer();
  }
  if (fs.existsSync(srcPng)) {
    return fs.readFileSync(srcPng);
  }
  throw new Error('Missing public/favicon.svg or public/icon.png');
};

(async () => {
  ensureDir(resourcesDir);
  ensureDir(publicDir);

  const sourceBuffer = await loadSourceBuffer();
  const publicOut = path.join(publicDir, 'icon.png');
  const resourcesPng = path.join(resourcesDir, 'icon.png');
  const resourcesIco = path.join(resourcesDir, 'icon.ico');

  await sharp(sourceBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 15, g: 123, b: 15, alpha: 255 } })
    .png()
    .toFile(resourcesPng);
  fs.copyFileSync(resourcesPng, publicOut);

  const pngToIco = require('png-to-ico');
  const icoBuffers = await Promise.all(
    ICO_SIZES.map((size) =>
      sharp(sourceBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 15, g: 123, b: 15, alpha: 255 } })
        .png()
        .toBuffer()
    )
  );
  const ico = await pngToIco(icoBuffers);
  fs.writeFileSync(resourcesIco, ico);

  if (!fs.existsSync(resourcesIco) || fs.statSync(resourcesIco).size < 1024) {
    console.error('icon.ico was not created or is too small');
    process.exit(1);
  }

  console.log('Generated public/icon.png, resources/icon.png, resources/icon.ico (multi-size)');
})().catch((err) => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
