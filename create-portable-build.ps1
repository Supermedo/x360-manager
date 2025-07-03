# X360 Manager - Create Portable Build
# This script creates a portable Electron application without using electron-builder

Param(
    [string]$Version = "1.0.0",
    [string]$AppName = "X360 Manager"
)

Write-Host "Creating portable build for $AppName v$Version" -ForegroundColor Cyan
Write-Host ""

# Define paths
$RootDir = $PSScriptRoot
$BuildDir = Join-Path $RootDir "build"
$NodeModulesDir = Join-Path $RootDir "node_modules"
$ElectronDir = Join-Path $NodeModulesDir "electron\dist"
$OutputDir = Join-Path $RootDir "dist-packager\win-unpacked"

# Check if React build exists
if (!(Test-Path $BuildDir)) {
    Write-Host "Error: React build not found. Please run 'npm run build' first." -ForegroundColor Red
    exit 1
}

# Check if Electron exists
if (!(Test-Path $ElectronDir)) {
    Write-Host "Error: Electron not found. Please run 'npm install' first." -ForegroundColor Red
    exit 1
}

# Create output directory
if (Test-Path $OutputDir) {
    Remove-Item $OutputDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
Write-Host "Created output directory: $OutputDir" -ForegroundColor Green

# Copy Electron files
Write-Host "Copying Electron runtime..." -ForegroundColor Yellow
Copy-Item "$ElectronDir\*" $OutputDir -Recurse -Force

# Rename electron.exe to app name
$ElectronExe = Join-Path $OutputDir "electron.exe"
$AppExe = Join-Path $OutputDir "$AppName.exe"
if (Test-Path $ElectronExe) {
    Rename-Item $ElectronExe $AppExe
    Write-Host "Renamed electron.exe to $AppName.exe" -ForegroundColor Green
}

# Create resources directory
$ResourcesDir = Join-Path $OutputDir "resources"
if (!(Test-Path $ResourcesDir)) {
    New-Item -ItemType Directory -Path $ResourcesDir -Force | Out-Null
}

# Create app directory inside resources
$AppDir = Join-Path $ResourcesDir "app"
if (Test-Path $AppDir) {
    Remove-Item $AppDir -Recurse -Force
}
New-Item -ItemType Directory -Path $AppDir -Force | Out-Null

# Copy application files
Write-Host "Copying application files..." -ForegroundColor Yellow

# Copy built React app
Copy-Item "$BuildDir\*" $AppDir -Recurse -Force

# Copy main Electron files
Copy-Item (Join-Path $RootDir "electron.js") $AppDir -Force
Copy-Item (Join-Path $RootDir "preload.js") $AppDir -Force
Copy-Item (Join-Path $RootDir "package.json") $AppDir -Force

# Create a simple package.json for the app
$AppPackageJson = @{
    name = "x360-manager"
    version = $Version
    description = "Xbox 360 Game Manager with Xenia Integration"
    main = "electron.js"
    author = "X360 Team"
    license = "MIT"
} | ConvertTo-Json -Depth 3

$AppPackageJson | Out-File -FilePath (Join-Path $AppDir "package.json") -Encoding UTF8

# Copy essential node modules (only production dependencies)
Write-Host "Copying essential dependencies..." -ForegroundColor Yellow
$NodeModulesAppDir = Join-Path $AppDir "node_modules"
New-Item -ItemType Directory -Path $NodeModulesAppDir -Force | Out-Null

# Copy only essential modules that Electron needs
$EssentialModules = @(
    "electron"
)

foreach ($module in $EssentialModules) {
    $SourceModule = Join-Path $NodeModulesDir $module
    $DestModule = Join-Path $NodeModulesAppDir $module
    if (Test-Path $SourceModule) {
        Copy-Item $SourceModule $DestModule -Recurse -Force
        Write-Host "  Copied $module" -ForegroundColor Gray
    }
}

# Copy license and readme files
Write-Host "Copying documentation..." -ForegroundColor Yellow
if (Test-Path (Join-Path $RootDir "LICENSE")) {
    Copy-Item (Join-Path $RootDir "LICENSE") $OutputDir -Force
}
if (Test-Path (Join-Path $RootDir "README.md")) {
    Copy-Item (Join-Path $RootDir "README.md") $OutputDir -Force
}

# Create version info file
$VersionInfo = @"
$AppName v$Version
Built: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Platform: Windows x64
Electron: $(node -p "require('electron/package.json').version" 2>$null)
Node.js: $(node --version 2>$null)
"@

$VersionInfo | Out-File -FilePath (Join-Path $OutputDir "VERSION.txt") -Encoding UTF8

# Calculate size
function Get-FolderSize {
    param([string]$Path)
    $size = (Get-ChildItem -Path $Path -Recurse -File | Measure-Object -Property Length -Sum).Sum
    return [math]::Round($size / 1MB, 2)
}

$BuildSize = Get-FolderSize -Path $OutputDir

Write-Host ""
Write-Host "SUCCESS! Portable build created:" -ForegroundColor Green
Write-Host "Location: $OutputDir" -ForegroundColor Cyan
Write-Host "Size: $BuildSize MB" -ForegroundColor Cyan
Write-Host "Executable: $AppName.exe" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now run the compression script to create setup packages." -ForegroundColor Yellow
Write-Host "Command: .\create-compressed-setup.ps1" -ForegroundColor White