# X360 Manager v1.6.7

## Security

- **Electron 43** — upgraded from the EOL Electron 22 line (Chromium 150).
- **Hardened renderer** — `webSecurity` and sandbox on; packaged UI loads from `app://` instead of `file://`.
- **Cover cache** — images are served only from the confined `cover-cache://` scheme.
- **IPC hardening** — command injection, path traversal, and unrestricted `openExternal` are blocked.
- **Profile PINs** — scrypt with a random salt, plus lockout after failed attempts.
- **Updates** — unsigned installers are no longer auto-downloaded; check, then download when you choose.

## Fixes

- **In-app updates** — checking for updates now starts the download. Settings includes Download and Restart & install.
- **Installer packaging** — all root `.js` / `.html` files are included so modules cannot be missing after install.
- **GitHub Actions** — builds the same NSIS installer as `npm run dist`.
- Duplicate `electron-updater` entry removed.
- Game covers load correctly with the new security settings.
- Unsaved Game Configuration changes prompt before leaving.
- Add Game cover URL is saved with the game.

## Download

Install **X360-Manager-Setup-1.6.7.exe** (Windows 10/11, 64-bit).
