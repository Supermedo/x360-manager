# X360 Manager - Distribution Guide

## 📦 Build Summary

Successfully created compressed setup packages for X360 Manager using a custom PowerShell-based build system that bypasses electron-builder signing issues.

## 📁 Generated Packages

The following distribution packages are available in the `dist-setup/` directory:

### 1. X360 Manager-Portable-1.0.0.zip (~185 MB)
- **Type**: Portable Application
- **Contents**: Complete standalone application
- **Installation**: Extract and run `X360 Manager.exe`
- **Benefits**: No installation required, can run from any location

### 2. X360 Manager-Setup-1.0.0.zip (~185 MB)
- **Type**: Setup Package with Installer
- **Contents**: Application + automatic installation script
- **Installation**: Extract and run `install.bat` for automatic setup
- **Benefits**: Creates desktop shortcuts, Start menu entries, and proper uninstaller

## 🚀 Distribution Instructions

### For End Users

#### Option A: Portable Installation
1. Download `X360 Manager-Portable-1.0.0.zip`
2. Extract to desired location (e.g., `C:\Games\X360Manager`)
3. Run `X360 Manager.exe`
4. No additional setup required

#### Option B: Full Installation
1. Download `X360 Manager-Setup-1.0.0.zip`
2. Extract the ZIP file
3. Run `install.bat` as Administrator
4. Follow the installation prompts
5. Launch from Start Menu or Desktop shortcut

### For Developers/Distributors

#### Upload Locations
- GitHub Releases
- File hosting services
- Direct download links

#### Recommended Distribution
- Provide both packages for user choice
- Include checksums for security verification
- Update download links in documentation

## 🔧 Build Process Overview

The build system uses a two-stage approach:

1. **Portable Build Creation** (`create-portable-build.ps1`)
   - Builds React application (`npm run build`)
   - Copies Electron runtime
   - Packages application files
   - Creates standalone executable

2. **Compression & Setup Creation** (`create-compressed-setup.ps1`)
   - Creates portable ZIP package
   - Generates installation scripts
   - Creates setup ZIP with installer
   - Adds documentation and version info

## 📋 Package Contents

### Portable Package
```
X360 Manager-Portable-1.0.0.zip
├── X360 Manager.exe          # Main application
├── resources/                # Application resources
│   └── app/                  # React build + Electron files
├── locales/                  # Electron localization
├── LICENSE                   # License file
├── README.md                 # Documentation
└── VERSION.txt               # Build information
```

### Setup Package
```
X360 Manager-Setup-1.0.0.zip
├── X360Manager/              # Portable application
├── install.bat               # Automatic installer
└── README.txt                # Installation instructions
```

## ✅ Quality Assurance

### Tested Features
- ✅ Application launches successfully
- ✅ React UI loads properly
- ✅ Electron integration works
- ✅ File associations (if configured)
- ✅ Installation/uninstallation process

### System Requirements
- Windows 10/11 (x64)
- ~500 MB free disk space
- Administrator rights (for full installation)

## 🔄 Future Updates

To create new releases:

1. Update version in `package.json`
2. Run build process:
   ```powershell
   npm run build
   .\create-portable-build.ps1
   .\create-compressed-setup.ps1
   ```
3. Test packages on clean system
4. Upload to distribution channels
5. Update download links

## 🛠️ Troubleshooting

### Common Issues

**Build Fails**
- Ensure Node.js and npm are installed
- Run `npm install` to install dependencies
- Check PowerShell execution policy

**Application Won't Start**
- Verify Windows version compatibility
- Check antivirus software (may flag unsigned executable)
- Ensure all files were extracted properly

**Installation Issues**
- Run `install.bat` as Administrator
- Check available disk space
- Verify write permissions to Program Files

## 📞 Support

For technical support or distribution questions:
- Check application logs in `%APPDATA%\X360Manager\logs`
- Review installation logs
- Contact development team with specific error messages

---

**Build Date**: January 7, 2025  
**Build System**: Custom PowerShell (bypasses electron-builder signing issues)  
**Package Size**: ~185 MB each  
**Compression**: ZIP format for maximum compatibility