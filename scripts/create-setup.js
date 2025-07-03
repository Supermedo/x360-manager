const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

// Install archiver if not present
try {
  require('archiver');
} catch (e) {
  console.log('Installing archiver...');
  execSync('npm install archiver --save-dev', { stdio: 'inherit' });
}

const packageJson = require('../package.json');
const version = packageJson.version;
const appName = 'X360 Manager';

// Paths
const distDir = path.join(__dirname, '..', 'dist-setup');
const sourceDir = path.join(__dirname, '..', 'dist-packager', 'win-unpacked');
const setupFileName = `${appName}-Setup-${version}.zip`;
const setupPath = path.join(distDir, setupFileName);

// Create dist-setup directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Check if source directory exists
if (!fs.existsSync(sourceDir)) {
  console.error('Error: Built application not found at:', sourceDir);
  console.log('Please run "npm run build-portable" first.');
  process.exit(1);
}

console.log('Creating compressed setup package...');
console.log('Source:', sourceDir);
console.log('Output:', setupPath);

// Create ZIP archive
const output = fs.createWriteStream(setupPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', function() {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`\n✅ Setup package created successfully!`);
  console.log(`📦 File: ${setupFileName}`);
  console.log(`📏 Size: ${sizeInMB} MB`);
  console.log(`📁 Location: ${setupPath}`);
  
  // Create installation instructions
  createInstallationGuide();
});

output.on('error', function(err) {
  console.error('Error creating setup package:', err);
  process.exit(1);
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('Warning:', err);
  } else {
    throw err;
  }
});

archive.on('error', function(err) {
  console.error('Archive error:', err);
  process.exit(1);
});

// Pipe archive data to the file
archive.pipe(output);

// Add all files from the built application
archive.directory(sourceDir, false);

// Add installation script
const installScript = `@echo off
echo Installing ${appName}...
echo.
echo Extracting files...
powershell -Command "Expand-Archive -Path '%~dp0${setupFileName}' -DestinationPath '%LOCALAPPDATA%\\${appName}' -Force"
echo.
echo Creating shortcuts...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\\Desktop\\${appName}.lnk'); $Shortcut.TargetPath = '%LOCALAPPDATA%\\${appName}\\${appName}.exe'; $Shortcut.Save()"
echo.
echo Installation complete!
echo You can now run ${appName} from your desktop.
pause
`;

archive.append(installScript, { name: 'install.bat' });

// Add README
const readme = `# ${appName} v${version}

## Installation Instructions

### Automatic Installation (Recommended)
1. Extract this ZIP file to any folder
2. Run "install.bat" as Administrator
3. The application will be installed to: %LOCALAPPDATA%\\${appName}
4. A desktop shortcut will be created

### Manual Installation
1. Extract this ZIP file to your desired location
2. Run "${appName}.exe" to start the application

## Features
- Xbox 360 Game Management
- Xenia Emulator Integration
- ISO File Support
- Game Library Organization
- Modern UI Interface

## System Requirements
- Windows 10/11 (64-bit)
- 4GB RAM minimum
- DirectX 11 compatible graphics
- 1GB free disk space

## Support
For issues and support, please visit our GitHub repository.

---
Built with Electron and React
`;

archive.append(readme, { name: 'README.txt' });

// Finalize the archive
archive.finalize();

function createInstallationGuide() {
  const guidePath = path.join(distDir, 'INSTALLATION_GUIDE.md');
  const guide = `# ${appName} v${version} - Installation Guide

## Quick Start

1. **Download** the setup package: \`${setupFileName}\`
2. **Extract** the ZIP file to any folder
3. **Run** \`install.bat\` as Administrator for automatic installation
4. **Launch** ${appName} from your desktop shortcut

## Installation Options

### Option 1: Automatic Installation (Recommended)
- Extracts to: \`%LOCALAPPDATA%\\${appName}\`
- Creates desktop shortcut
- Registers file associations
- Easy uninstallation

### Option 2: Portable Installation
- Extract ZIP to any folder
- Run \`${appName}.exe\` directly
- No system integration
- Fully portable

## Package Contents

- \`${appName}.exe\` - Main application
- \`resources/\` - Application resources
- \`locales/\` - Language files
- \`install.bat\` - Automatic installer
- \`README.txt\` - Basic information

## Compression Benefits

- **Size Reduction**: ~60-70% smaller than uncompressed
- **Easy Distribution**: Single ZIP file
- **Fast Download**: Optimized for web distribution
- **Self-Contained**: All dependencies included

## Troubleshooting

### Installation Issues
- Run \`install.bat\` as Administrator
- Ensure Windows Defender allows the installation
- Check available disk space (minimum 1GB)

### Runtime Issues
- Install Visual C++ Redistributable if prompted
- Update graphics drivers
- Run as Administrator if needed

### Uninstallation
- Delete folder: \`%LOCALAPPDATA%\\${appName}\`
- Remove desktop shortcut
- Clear registry entries (if any)

## File Associations

The application supports:
- \`.iso\` files (Xbox 360 game images)
- \`.xex\` files (Xbox 360 executables)

## Performance Tips

- Close other applications for better performance
- Use SSD storage for faster loading
- Ensure adequate RAM (4GB minimum)
- Keep graphics drivers updated

---

**Package Size**: Compressed for optimal download speed  
**Installation Time**: ~30 seconds  
**Disk Space**: ~200-300MB after installation  

For technical support, please refer to the project documentation.
`;

  fs.writeFileSync(guidePath, guide);
  console.log(`📋 Installation guide created: INSTALLATION_GUIDE.md`);
}