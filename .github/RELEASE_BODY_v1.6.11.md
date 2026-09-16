## X360 Manager 1.6.11

### Fixed
- **Games not starting** — Xenia Canary no longer accepts `--internal_display_resolution` (process quit immediately). 1080p launches now use `custom_internal_display_resolution_x/y`; 1440p/4K still use draw resolution scale.
- Launch errors from the library/console show a dialog instead of failing silently.
- If Xenia exits right after start, the app reports it instead of looking like nothing happened.

### Notes
- Reinstall or update over 1.6.8–1.6.10. Emulator path under `...\XeniaCanary\xenia_canary.exe` is unchanged.
