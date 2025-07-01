# Game Cover Setup Instructions

## RAWG API Key Setup (Required for Game Covers)

To enable automatic game cover fetching, you need to get a free API key from RAWG:

1. Visit https://rawg.io/apidocs
2. Create a free account
3. Get your API key
4. Replace `YOUR_RAWG_API_KEY` in the source code with your actual API key

### Where to add the API key:

In `src/components/GameLibrary.js`, find this line:
```javascript
const apiKey = 'YOUR_RAWG_API_KEY'; // Replace with actual API key
```

Replace `YOUR_RAWG_API_KEY` with your actual API key from RAWG.

## Troubleshooting

### Game Covers Not Showing
1. Check if you have a valid RAWG API key
2. Check your internet connection
3. Open Developer Tools (F12) and check the Console for error messages
4. The app will try to fetch covers without an API key as fallback, but this has very limited requests

### Bulk Add Not Working
1. Make sure you're selecting valid game files (.iso, .xex, .xbe, .bin, .img, .rom, .zip, .7z)
2. Check the Console (F12) for error messages
3. Try adding games one by one to isolate the issue

### Download Issues
1. All three emulator versions should now download properly
2. The app handles redirects automatically
3. Check your internet connection
4. Try a different download location

### Game Launch Issues
1. The Play button now uses game-specific configuration if available
2. If no game-specific config exists, it falls back to default settings
3. Configure individual games in the Game Config section for optimal performance

## Features Fixed

✅ **Game Launch**: Now uses game-specific configuration instead of default settings
✅ **Bulk Add**: Can now select multiple ROM files at once
✅ **Game Covers**: Automatic cover fetching with RAWG API (requires API key)
✅ **Download Versions**: All emulator versions should download properly
✅ **Error Handling**: Better error messages and debugging information

## Development Notes

For developers:
- Console logging has been added for debugging
- Error handling has been improved
- The app gracefully falls back when API calls fail
- Redirect handling is implemented for GitHub releases