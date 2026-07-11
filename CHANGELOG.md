# Changelog

All notable changes to X360 Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.6] - 2026-07-11

### Fixed
- Installed app crash on launch: include missing `accountFile.js` in the Windows installer package

## [1.6.5] - 2026-07-11

### Added
- **Custom in-game FPS overlay** — measures Xenia window FPS via desktop capture
- **Game patch manager** — configure and apply Xenia patch TOML files from game settings
- **Back button** in Metro game settings panel
- **SECURITY.md** and Dependabot for dependency updates

### Fixed
- Metro dashboard focus highlight not updating on screen (stale render cache)
- Keyboard and controller input fighting each other in console mode
- Controller navigation jumping/skipping tiles (D-pad vs stick deconflict, slower repeat)
- Game patches not applying on launch
- Window focus restored after emulator exits

### Changed
- Removed debug HTML files that contained hardcoded API keys
- Cleaned old release note duplicates from the repository
- Updated GitHub Actions to v4 with explicit release permissions

## [1.6.4] - 2026-07-11

### Added
- **Metro console (DashX360-style)** — search, home, games, and settings channels with hub tiles
- **Home hub** — Last played, Favorite, Most played, and Game List boxes
- **Search channel** — library search with controller and keyboard navigation
- **Settings blade** — 4×2 green tile grid in console mode
- **Boot video** — DashX360 Boot Screen plays when entering console mode
- **Tab slide animations** — cross-slide between channels with background parallax
- **DashX360 sounds** — Page Left / Page Right on tab changes
- **Favorite (X)** — toggle favorites from hub tiles, library, and game options
- **Profile editor overlay** — blade-style UI with controller support
- **Custom in-game FPS overlay** — measures Xenia window FPS via desktop capture
- **Game patch manager** — configure and apply Xenia patch TOML files from game settings
- **Back button** in Metro game settings panel

### Fixed
- Metro dashboard focus highlight not updating (stale render cache)
- Keyboard and controller input fighting each other in console mode
- Controller navigation jumping/skipping tiles (D-pad vs stick, repeat tuning)
- Game patches not applying on launch (`apply_patches` + patch file toggles)
- Search input — Backspace and Delete work while typing
- Home hub tile mapping — favorite/most played slots and game list action
- Window focus restored after emulator exits (keyboard/gamepad input)

### Changed
- Console mode entry plays boot video then dashboard (startup sound on transition)
- Removed debug HTML demos that contained hardcoded API keys from the repository

## [1.6.3] - 2026-05-24

### Added
- **Full app UI translations** — Dashboard, Setup, Settings sections, Game Library, Game Configuration, Help, and update banner now use the translation system
- **Arabic UI** — complete Arabic strings for all new UI keys (RTL layout supported)

### Changed
- App language picker applies across major screens (not just sidebar/title bar)
- Version bump for testing auto-update notification from v1.6.2

## [1.6.2] - 2026-05-24

### Fixed
- **Xenia config corruption** — safe TOML patching (quoted strings, valid section headers); no longer rewrites the full RetroBat `xenia-canary.config.toml` on every launch
- **Language override** — writes `user_language` to `[XConfig]` in the main config before launch plus `--user_language` CLI flag
- **Game Properties settings** — launch config merges per-game overrides correctly (resolution, vsync, keyboard, language, presets)
- **Context menu** — no longer clipped at the bottom of the library (portal + flip above cursor)
- **Xbox Live profile patches** — only update existing config files; safer `[Profiles]` section handling

### Added
- **Auto-update notifications** — checks GitHub Releases on startup; banner + Settings → System → App updates
- **Version display** — current version shown in title bar, sidebar, and Settings
- **Supported languages per game** — detected from title/region hints, x360db, and ScreenScraper; shown in Game Configuration
- **Language UI** — all Xenia languages always selectable; false “not supported” warnings removed; path/folder detection and ScreenScraper name parsing improved
- **Config auto-repair** on app startup (fixes merged headers like `[Display]fullscreen`)
- Debounced persistence for library/settings; batched cover sync improvements

### Changed
- FPS overlay and most display options use **CLI flags only** (no global config writes)
- Explicit “Apply preset” still updates global Xenia config when you choose to

## [1.6.1] - 2026-05-24

### Fixed
- Windows app icon embedded correctly in `.exe`, installer, and shortcuts (electron-builder paths + rcedit `afterPack`)
- Fullscreen mode no longer traps users (title bar visible, system controls work, Esc / F11 exit)
- Context menu and Game Properties navigation in fullscreen
- Library lag during cover sync (debounced saves, single auto-sync pass, batched updates)
- Cover images loading slowly when already cached locally

### Changed
- App data path documented as `%APPDATA%\x360-manager\`
- Icons copied to `build/` after production build for dev and packaged window icon

## [1.6.0] - 2026-05

See [RELEASE_v1.6.0.md](RELEASE_v1.6.0.md) for full v1.6.0 notes (profiles, persistence, covers, XBLA, onboarding).

## [1.0.0] - 2024-12-19

### Added
- Initial release of X360 Manager
- Modern React-based user interface with dark gaming theme
- Xbox 360 game library management with grid and list views
- Automatic game cover art fetching with fallback options
- Recent games section with quick access and remove functionality
- Advanced game configuration with graphics, audio, and performance settings
- Xenia emulator integration with optimized launch parameters
- Comprehensive help section with getting started guide
- About section with developer information and support links
- Settings management for application preferences
- Emulator setup wizard for configuring Xenia paths
- Dashboard with library overview and quick stats
- Responsive design optimized for desktop use
- Professional typography and smooth animations
- File system integration for game and emulator selection
- Local storage for persistent settings and game library data
- Error handling and user feedback systems
- Modern sidebar navigation with intuitive icons
- Search and filter functionality for game library
- Game metadata management (title, genre, rating, description)
- One-click game launching with custom configurations
- Support for various Xbox 360 game formats (.iso, .xex, etc.)
- Ko-fi integration for project support
- Contact information and GitHub profile links
- Comprehensive documentation and troubleshooting guides

### Technical Features
- Built with Electron for cross-platform desktop support
- React frontend with modern component architecture
- CSS custom properties for consistent theming
- IPC communication between main and renderer processes
- Automated build and packaging system
- ESLint integration for code quality
- Hot reload support for development
- Production build optimization

### Developer Experience
- Comprehensive README with setup instructions
- Contributing guidelines for open source collaboration
- MIT license for open source distribution
- GitHub Actions workflow for automated builds and releases
- Proper .gitignore for clean repository management
- Development and production build scripts
- Code organization with clear component structure

### System Requirements
- Windows 10/11 (64-bit)
- 8GB RAM minimum (16GB recommended)
- DirectX 12 compatible GPU
- Modern multi-core processor
- 500MB storage for application
- Additional space for games and covers

### Known Issues
- ESLint warnings for unused variables in some components
- React useEffect dependency warnings (non-breaking)
- Primary focus on Windows platform (other platforms untested)

---

## Future Releases

### Planned Features
- Game import/export functionality
- Custom game categories and tags
- Achievement tracking integration
- Save state management
- Controller configuration presets
- Automatic Xenia updates
- Game compatibility database
- Performance benchmarking tools
- Cloud save backup options
- Multi-language support
- Themes and customization options
- Plugin system for extensions
- Game time tracking
- Screenshot gallery
- Video recording integration

### Potential Improvements
- Enhanced error reporting
- Better game detection algorithms
- Improved cover art sources
- Advanced filtering options
- Bulk game operations
- Import from other game managers
- Automated game organization
- Performance optimizations
- Accessibility improvements
- Mobile companion app

---

**Note**: This changelog will be updated with each release to track all changes, improvements, and bug fixes.