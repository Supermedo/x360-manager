# Building X360 Manager Setup Installer

This guide explains how to build a compressed setup installer for X360 Manager using electron-builder.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- All project dependencies installed

## Setup Configuration

The project is configured with electron-builder to create optimized setup installers with maximum compression. The configuration includes:

### Features
- **Maximum Compression**: Uses `compression: "maximum"` for smallest file size
- **NSIS Installer**: Creates Windows setup with custom options
- **Multi-language Support**: English and Arabic installer languages
- **Desktop & Start Menu Shortcuts**: Automatically created during installation
- **Custom Installation Directory**: Users can choose installation location
- **File Associations**: Associates .iso files with X360 Manager
- **Uninstaller**: Clean uninstallation process

### Build Outputs
- **Windows**: `X360-Manager-Setup-{version}.exe` (NSIS installer)
- **macOS**: `X360-Manager-{version}.dmg` (DMG package)
- **Linux**: `X360-Manager-{version}.AppImage` (AppImage)

## Building the Setup Installer

### 1. Build for Windows Only (Recommended)
```bash
npm run build-setup
```

This command will:
1. Build the React application
2. Package the Electron app
3. Create a compressed Windows setup installer
4. Output to `dist-setup/` directory

### 2. Build for All Platforms
```bash
npm run build-all
```

### 3. Manual Build Process
```bash
# Step 1: Build React app
npm run build

# Step 2: Create installer
npm run electron-build
```

## Output Files

After building, you'll find the setup files in the `dist-setup/` directory:

```
dist-setup/
├── X360-Manager-Setup-1.0.0.exe     # Windows installer
├── X360-Manager-1.0.0.dmg           # macOS package
└── X360-Manager-1.0.0.AppImage      # Linux package
```

## Installer Features

### Windows NSIS Installer
- **Size**: Highly compressed (typically 50-70% smaller than portable version)
- **Installation Options**: Custom directory selection
- **Shortcuts**: Desktop and Start Menu shortcuts
- **Language**: English and Arabic support
- **File Associations**: .iso files open with X360 Manager
- **Uninstaller**: Clean removal with registry cleanup
- **Auto-run**: Option to run application after installation

### Installation Process
1. User downloads `X360-Manager-Setup-1.0.0.exe`
2. Runs installer (no admin rights required)
3. Chooses installation directory
4. Installer extracts and configures application
5. Creates shortcuts and file associations
6. Optionally launches application

## Size Optimization

The setup installer uses several optimization techniques:

1. **Maximum Compression**: LZMA compression algorithm
2. **File Exclusions**: Removes unnecessary files and cache
3. **Tree Shaking**: Only includes required dependencies
4. **Asset Optimization**: Compresses images and resources

### Excluded Files
- Development dependencies
- Cache files
- Source maps
- Documentation files
- Git metadata
- IDE configuration files

## Troubleshooting

### Build Fails
1. Ensure all dependencies are installed: `npm install`
2. Clear cache: `npm run build` then retry
3. Check Node.js version (v14+ required)

### Large File Size
1. Check `dist-setup/` for multiple builds
2. Clear `node_modules/.cache`
3. Verify exclusion patterns in package.json

### Installer Issues
1. Test installer on clean Windows system
2. Check antivirus software (may flag unsigned executable)
3. Verify file associations work correctly

## Code Signing (Optional)

For production releases, consider code signing:

1. Obtain code signing certificate
2. Add certificate configuration to package.json
3. Set environment variables for certificate
4. Rebuild with signing enabled

```json
"win": {
  "certificateFile": "path/to/certificate.p12",
  "certificatePassword": "password"
}
```

## Distribution

### GitHub Releases
1. Create new release on GitHub
2. Upload `X360-Manager-Setup-1.0.0.exe`
3. Include release notes and installation instructions

### Direct Distribution
1. Host setup file on web server
2. Provide download link to users
3. Include installation guide

## File Structure After Installation

```
C:\Program Files\X360 Manager\
├── X360 Manager.exe              # Main application
├── resources/
│   └── app.asar                  # Packaged application
├── locales/                      # Language files
├── LICENSE                       # License file
└── Uninstall X360 Manager.exe   # Uninstaller
```

## Benefits of Setup Installer

1. **Smaller Download**: 50-70% size reduction vs portable
2. **Professional Installation**: Standard Windows installer experience
3. **File Associations**: Automatic .iso file handling
4. **Easy Updates**: Can be updated through installer
5. **Clean Uninstall**: Removes all files and registry entries
6. **User-Friendly**: No technical knowledge required

## Next Steps

1. Test installer on different Windows versions
2. Consider auto-updater implementation
3. Add digital signature for security
4. Create installation documentation for users
5. Set up automated build pipeline