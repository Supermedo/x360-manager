// CRA + Electron file://
export function getPublicAssetUrl(filename) {
  const base = process.env.PUBLIC_URL || '';
  if (!base) {
    return filename.startsWith('.') ? filename : `./${filename}`;
  }
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}${filename.replace(/^\//, '')}`;
}