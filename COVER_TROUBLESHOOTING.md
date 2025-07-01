# X360 Manager - Cover Image Troubleshooting Guide

## Issue: Game covers and information not loading

### Root Cause
The main issue was **Content Security Policy (CSP) restrictions** in the web browser that blocked external API requests. This has been resolved by:

1. **Updated CSP Headers**: Modified the Content Security Policy to allow external API connections
2. **Multiple Fallback Sources**: Implemented multiple cover sources with proper error handling
3. **Electron Environment**: The packaged app bypasses browser restrictions entirely

## Cover Sources (Priority Order)

1. **RAWG API** - Primary gaming database
2. **OpenCritic API** - CORS-friendly alternative
3. **Local Images** - Files in `public/covers/` directory
4. **IGDB API** - Backup gaming database
5. **Smart Placeholders** - Generated SVG based on game name

## Solutions

### Option 1: Use the Electron App (Recommended)
The packaged Electron application (`X360 Manager.exe`) bypasses CORS restrictions and should work with external APIs.

### Option 2: Add Local Cover Images
Place cover images in the `public/covers/` directory with these naming conventions:
- `{game-name}.jpg`
- `{game-name}.png`
- `{game-name}.webp`

Example: For "Halo 3", save as `public/covers/halo-3.jpg`

### Option 3: Configure API Keys (Optional)
For better results, you can add API keys in Settings:
- **RAWG API**: Get free key from https://rawg.io/apidocs
- **IGDB API**: Get key from https://api.igdb.com/

### Option 4: Browser Development (Limited)
For web development, you may need to:
1. Disable CORS in your browser (not recommended for security)
2. Use a CORS proxy service
3. Run a local proxy server

## Technical Improvements Made

### Game Card Fixes
- ✅ Reduced card size for better layout
- ✅ Removed shaking animation on hover
- ✅ Adjusted cover image dimensions
- ✅ Improved responsive design

### Cover System Enhancements
- ✅ Multiple API sources with fallbacks
- ✅ Detailed error logging and handling
- ✅ Rate limiting with delays between requests
- ✅ Local image support
- ✅ Smart placeholder generation
- ✅ Updated Content Security Policy

### Application Updates
- ✅ Changed name from X365 to X360 Manager
- ✅ Updated all references and metadata
- ✅ Fixed localStorage keys
- ✅ Updated package information

## Testing the Fixes

1. **Run the Electron App**: Use `X360 Manager.exe` for best results
2. **Check Console**: Open Developer Tools (F12) to see cover loading attempts
3. **Add Test Games**: Try adding games and watch the console for cover fetch attempts
4. **Monitor Network**: Check Network tab in DevTools for API request status

## Files Updated

- `src/components/GameLibrary.js` - Enhanced cover fetching system
- `src/components/Sidebar.js` - Updated app name
- `src/components/Dashboard.js` - Updated app name
- `src/components/Settings.js` - Updated app name and API configuration
- `src/context/GameContext.js` - Updated localStorage keys
- `src/context/SettingsContext.js` - Updated localStorage keys
- `public/index.html` - Fixed CSP and updated title
- `public/manifest.json` - Updated app metadata
- `package.json` - Updated package information
- `public/covers/` - Directory for local cover images

## Expected Behavior

With these fixes:
1. **Electron App**: Should fetch covers from all sources successfully
2. **Web Browser**: Should work with updated CSP, but may still have some limitations
3. **Local Images**: Always work regardless of network restrictions
4. **Placeholders**: Generated automatically when no cover is found
5. **Error Handling**: Graceful fallbacks with detailed console logging

The packaged `X360 Manager.exe` provides the best experience by completely bypassing browser security restrictions.