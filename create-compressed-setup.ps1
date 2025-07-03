# X360 Manager - Create Compressed Setup Package
# This script creates a compressed ZIP package from the existing build

Param(
    [string]$Version = "1.0.0",
    [string]$AppName = "X360 Manager"
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

Write-Host "Creating compressed setup package for $AppName v$Version" -ForegroundColor $Cyan
Write-Host ""

# Define paths
$RootDir = $PSScriptRoot
$SourceDir = Join-Path $RootDir "dist-packager\win-unpacked"
$SetupDir = Join-Path $RootDir "dist-setup"
$SetupFile = Join-Path $SetupDir "$AppName-Setup-$Version.zip"
$PortableFile = Join-Path $SetupDir "$AppName-Portable-$Version.zip"

# Create setup directory
if (!(Test-Path $SetupDir)) {
    New-Item -ItemType Directory -Path $SetupDir -Force | Out-Null
    Write-Host "Created setup directory: $SetupDir" -ForegroundColor $Green
}

# Check if source exists
if (!(Test-Path $SourceDir)) {
    Write-Host "Error: Source directory not found: $SourceDir" -ForegroundColor $Red
    Write-Host "Please build the application first using: npm run build && npm run electron-build" -ForegroundColor $Yellow
    exit 1
}

Write-Host "Source directory: $SourceDir" -ForegroundColor $Green
Write-Host "Output directory: $SetupDir" -ForegroundColor $Green
Write-Host ""

# Function to get folder size
function Get-FolderSize {
    param([string]$Path)
    $size = (Get-ChildItem -Path $Path -Recurse -File | Measure-Object -Property Length -Sum).Sum
    return [math]::Round($size / 1MB, 2)
}

# Get original size
$OriginalSize = Get-FolderSize -Path $SourceDir
Write-Host "Original size: $OriginalSize MB" -ForegroundColor $Cyan

# Create portable ZIP
Write-Host "Creating portable package..." -ForegroundColor $Yellow
try {
    Compress-Archive -Path "$SourceDir\*" -DestinationPath $PortableFile -CompressionLevel Optimal -Force
    $PortableSize = [math]::Round((Get-Item $PortableFile).Length / 1MB, 2)
    $PortableReduction = [math]::Round((($OriginalSize - $PortableSize) / $OriginalSize) * 100, 1)
    Write-Host "Portable package created: $PortableSize MB ($PortableReduction% reduction)" -ForegroundColor $Green
} catch {
    Write-Host "Error creating portable package: $($_.Exception.Message)" -ForegroundColor $Red
    exit 1
}

# Create installation script
$InstallScript = @'
@echo off
echo ========================================
echo  X360 Manager v1.0.0 Installer
echo ========================================
echo.
echo Installing X360 Manager...
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\X360 Manager"
set "DESKTOP_SHORTCUT=%USERPROFILE%\Desktop\X360 Manager.lnk"
set "STARTMENU_SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\X360 Manager.lnk"

echo Installation directory: %INSTALL_DIR%
echo.

REM Create installation directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo Extracting files...
powershell -Command "Expand-Archive -Path '%~dp0X360 Manager-Portable-1.0.0.zip' -DestinationPath '%INSTALL_DIR%' -Force"

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to extract files
    pause
    exit /b 1
)

echo Files extracted successfully
echo.

echo Creating shortcuts...
REM Create desktop shortcut
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP_SHORTCUT%'); $Shortcut.TargetPath = '%INSTALL_DIR%\X360 Manager.exe'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'X360 Manager - Xbox 360 Game Manager'; $Shortcut.Save()"

REM Create start menu shortcut
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%STARTMENU_SHORTCUT%'); $Shortcut.TargetPath = '%INSTALL_DIR%\X360 Manager.exe'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'X360 Manager - Xbox 360 Game Manager'; $Shortcut.Save()"

echo Shortcuts created
echo.

echo Registering file associations...
REM Register .iso file association
reg add "HKCU\Software\Classes\.iso" /ve /d "X360Manager.IsoFile" /f >nul 2>&1
reg add "HKCU\Software\Classes\X360Manager.IsoFile" /ve /d "Xbox 360 ISO Image" /f >nul 2>&1
reg add "HKCU\Software\Classes\X360Manager.IsoFile\shell\open\command" /ve /d "\"%INSTALL_DIR%\X360 Manager.exe\" \"%1\"" /f >nul 2>&1

echo File associations registered
echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo X360 Manager has been installed successfully!
echo Location: %INSTALL_DIR%
echo Desktop shortcut: Created
echo Start menu: Created
echo File associations: .iso files
echo.
echo You can now:
echo   - Double-click the desktop shortcut
echo   - Search for "X360 Manager" in Start menu
echo   - Double-click .iso files to open with X360 Manager
echo.
set /p "choice=Press Enter to launch X360 Manager now, or close this window..."
if not "%choice%"=="" goto end
start "" "%INSTALL_DIR%\X360 Manager.exe"
:end
'@

# Create setup package with installer
Write-Host "Creating setup package with installer..." -ForegroundColor $Yellow

# Create temporary directory for setup contents
$TempSetupDir = Join-Path $env:TEMP "X360ManagerSetup"
if (Test-Path $TempSetupDir) {
    Remove-Item $TempSetupDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempSetupDir -Force | Out-Null

# Copy portable package to temp directory
Copy-Item $PortableFile $TempSetupDir

# Create install.bat in temp directory
$InstallBatPath = Join-Path $TempSetupDir "install.bat"
$InstallScript | Out-File -FilePath $InstallBatPath -Encoding ASCII

# Create README.txt
$ReadmeContent = @'
X360 Manager v1.0.0 - Setup Package
========================================

Thank you for downloading X360 Manager!

INSTALLATION INSTRUCTIONS:

1. AUTOMATIC INSTALLATION (Recommended):
   - Run 'install.bat' as Administrator
   - Follow the on-screen instructions
   - The app will be installed to: %LOCALAPPDATA%\X360 Manager
   - Desktop and Start Menu shortcuts will be created

2. PORTABLE INSTALLATION:
   - Extract 'X360 Manager-Portable-1.0.0.zip' to any folder
   - Run 'X360 Manager.exe' directly
   - No installation required

FEATURES:
- Xbox 360 Game Management
- Xenia Emulator Integration
- ISO File Support
- Modern UI Interface
- File Association (.iso files)

SYSTEM REQUIREMENTS:
- Windows 10/11 (64-bit)
- 4GB RAM minimum
- DirectX 11 compatible graphics
- 1GB free disk space

SUPPORT:
For issues and updates, visit our GitHub repository.

Package Contents:
- install.bat - Automatic installer
- X360 Manager-Portable-1.0.0.zip - Portable application
- README.txt - This file

Built with Electron and React
Compressed for optimal download size
'@

$ReadmePath = Join-Path $TempSetupDir "README.txt"
$ReadmeContent | Out-File -FilePath $ReadmePath -Encoding UTF8

# Create the final setup ZIP
try {
    Compress-Archive -Path "$TempSetupDir\*" -DestinationPath $SetupFile -CompressionLevel Optimal -Force
    $SetupSize = [math]::Round((Get-Item $SetupFile).Length / 1MB, 2)
    $SetupReduction = [math]::Round((($OriginalSize - $SetupSize) / $OriginalSize) * 100, 1)
    Write-Host "Setup package created: $SetupSize MB ($SetupReduction% reduction)" -ForegroundColor $Green
} catch {
    Write-Host "Error creating setup package: $($_.Exception.Message)" -ForegroundColor $Red
    exit 1
} finally {
    # Clean up temp directory
    if (Test-Path $TempSetupDir) {
        Remove-Item $TempSetupDir -Recurse -Force
    }
}

Write-Host ""
Write-Host "SUCCESS! Compressed packages created:" -ForegroundColor $Green
Write-Host "Setup Package: $SetupFile ($SetupSize MB)" -ForegroundColor $Cyan
Write-Host "Portable Package: $PortableFile ($PortableSize MB)" -ForegroundColor $Cyan
Write-Host ""
Write-Host "Compression Statistics:" -ForegroundColor $Yellow
Write-Host "   Original size: $OriginalSize MB" -ForegroundColor $White
Write-Host "   Setup size: $SetupSize MB (${SetupReduction}% reduction)" -ForegroundColor $White
Write-Host "   Portable size: $PortableSize MB (${PortableReduction}% reduction)" -ForegroundColor $White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor $Yellow
Write-Host "   1. Test the setup package on a clean system" -ForegroundColor $White
Write-Host "   2. Upload to GitHub releases or distribution platform" -ForegroundColor $White
Write-Host "   3. Share download links with users" -ForegroundColor $White
Write-Host ""
Write-Host "Ready for distribution!" -ForegroundColor $Green