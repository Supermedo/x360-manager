# X360 Manager v1.6.5

## Highlights

- **Metro console navigation fixed** — focus box moves on screen; keyboard and controller no longer fight
- **Smoother gamepad movement** — no more jumping/skipping tiles
- **Custom FPS overlay** — in-game FPS counter for Xenia
- **Game patches** — toggle patches in settings; applied on launch
- **Security cleanup** — removed debug files with hardcoded API keys; added SECURITY.md

## Download

Install **X360-Manager-Setup-1.6.5.exe** (Windows 10/11, 64-bit) from assets below.

## Setup

1. Enable **Beta Metro Console** in App Settings
2. Open **Console Mode** from the game library
3. Optional: copy `.env.example` → `.env` for ScreenScraper (keep `.env` local only)

## Security

See [SECURITY.md](SECURITY.md) to report vulnerabilities privately. Never commit `.env`.

## Changes since v1.6.4

- FPS overlay, patch manager, Metro settings back button
- Fixed focus highlight, keyboard/controller conflicts, gamepad repeat tuning
- Removed insecure debug HTML demos from repository
