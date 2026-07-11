# X360 Manager v1.6.4 — Metro Console Update

## Highlights

- **DashX360-style Metro console** — enable in Settings → **Beta Metro Console**
- **Home hub** — Last played, Favorite, Most played, and Game List tiles
- **Search channel** — search your library with controller/keyboard support
- **Settings blade** — 4×2 green tile grid (System, Preferences, Profile, etc.)
- **Custom FPS overlay** — in-game FPS counter for Xenia (no emulator profiler needed)
- **Game patches** — enable/disable patches from game settings; applied on launch
- **Console navigation fixes** — focus highlight, keyboard/controller deconflict, smoother gamepad movement

## Download

Install **X360-Manager-Setup-1.6.4.exe** (Windows 10/11, 64-bit) from the assets below.

Portable users: extract and run `X360 Manager.exe` from the ZIP.

## Setup

1. Enable **Beta Metro Console** in App Settings
2. Open **Console Mode** from the game library
3. Use **LB / RB** for tabs; **X** to favorite; **Y** for game options
4. Optional: copy `.env.example` to `.env` for ScreenScraper cover art (never share your `.env`)

## Security

- Do not commit `.env` — credentials stay local only
- See [SECURITY.md](SECURITY.md) to report vulnerabilities privately

## Changes since v1.6.3

- Metro dashboard: search, home, games, settings channels
- Boot video + startup sound on console entry
- Tab slide animation and DashX360 navigation sounds
- FPS overlay, patch manager, game settings back button
- Fixed Metro focus not moving on screen, gamepad/keyboard conflicts, patch apply on launch
