# Xeina Emulator Manager - Troubleshooting Guide

## Common Issues and Solutions

### 🚨 "All downloaded emulator damaged" Issue

**Problem**: Downloaded emulators appear corrupted or don't work properly.

**Solutions**:
1. **Re-download with validation**: The app now validates downloads automatically
2. **Check antivirus**: Your antivirus might be quarantining emulator files
   - Add the download folder to antivirus exclusions
   - Temporarily disable real-time protection during download
3. **Download from official sources**: Use the built-in downloader or get emulators from:
   - Official Xeina repository: https://github.com/xeina-emu/xeina/releases
   - Trusted emulation communities

### 🎮 "Game not working" Issue

**Problem**: Games don't launch or crash immediately.

**Solutions**:
1. **File validation**: The app now automatically validates game files
2. **Supported formats**: Ensure your game is in a supported format:
   - `.iso` (most common)
   - `.bin/.cue` (paired files)
   - `.img`, `.nrg`, `.mdf`, `.ccd`
3. **File integrity**: Check if the game file is complete and not corrupted
4. **Emulator compatibility**: Some games may require specific emulator settings

### ⚙️ Emulator Configuration Issues

**Problem**: Emulator path is set but games won't launch.

**Solutions**:
1. **Path validation**: The app now validates emulator paths automatically
2. **File permissions**: Ensure the emulator executable has proper permissions
3. **Dependencies**: Some emulators require additional files (DLLs, BIOS files)
4. **Compatibility**: Run emulator in compatibility mode if needed

## New Features in This Update

### ✅ Automatic Validation
- **Emulator validation**: Checks if emulator files are valid and executable
- **Game file validation**: Verifies game files are in supported formats
- **Path verification**: Ensures all file paths exist and are accessible

### 🔧 Enhanced Error Messages
- **Detailed error reporting**: Clear explanations of what went wrong
- **Suggested solutions**: Actionable steps to fix issues
- **File information**: Shows file size, format, and status

### 🚀 Improved Launch Process
- **Pre-launch validation**: Checks emulator and game before launching
- **Better command handling**: Improved command-line argument processing
- **Timeout protection**: Prevents hanging during launch attempts

## Step-by-Step Troubleshooting

### 1. Emulator Setup
1. Go to **Setup** section
2. Either download a new emulator or select existing one
3. The app will automatically validate your selection
4. If validation fails, follow the error message instructions

### 2. Adding Games
1. Go to **Game Library**
2. Click **Add Game**
3. Select your game file
4. The app will validate the file format and accessibility
5. If validation fails, check the file and try again

### 3. Launching Games
1. Click **Play** on any game
2. The app will validate both emulator and game file
3. If validation passes, the game will launch
4. If issues occur, check the error message for specific solutions

## Advanced Troubleshooting

### Command Line Testing
You can test emulator functionality manually:
```cmd
"C:\path\to\emulator.exe" "C:\path\to\game.iso"
```

### Log Files
Check the application console for detailed error messages:
- Open Developer Tools (Ctrl+Shift+I) in the app
- Look at the Console tab for error details

### File Permissions
Ensure proper file permissions:
1. Right-click emulator executable
2. Properties → Security
3. Ensure your user has "Full Control"

## Getting Help

If you're still experiencing issues:
1. Check the error messages in the app - they now provide specific guidance
2. Verify your emulator and game files using the built-in validation
3. Try different emulator versions or game file formats
4. Check online emulation communities for game-specific issues

## Prevention Tips

1. **Use trusted sources**: Only download emulators from official repositories
2. **Keep backups**: Maintain backup copies of working emulator configurations
3. **Regular validation**: Periodically check your emulator and game files
4. **Update regularly**: Keep your emulators updated to the latest versions
5. **Antivirus exclusions**: Add emulator folders to antivirus exclusions

The updated Xeina Emulator Manager now includes comprehensive validation and error handling to help prevent and diagnose these common issues automatically!