# Cover Loading Debug Guide

## Quick Fixes for Cover Loading Issues

### 1. Check Browser Console
Open Developer Tools (F12) and check the Console tab for error messages when covers fail to load.

### 2. Common Issues and Solutions

#### CORS Errors
- **Problem**: `Access to fetch at 'https://api.rawg.io/api/games' from origin 'http://localhost:3000' has been blocked by CORS policy`
- **Solution**: This should work in the packaged Electron app. CORS only affects browser development mode.

#### API Rate Limiting
- **Problem**: Too many requests to RAWG API
- **Solution**: The app includes automatic rate limiting (500ms delay between requests)

#### Missing API Keys
- **Problem**: No covers loading from RAWG or IGDB
- **Solution**: 
  1. Go to Settings
  2. Add your RAWG API key: `e0dbb76130754c98a1e7648bbe45103d` (default provided)
  3. Optionally add IGDB credentials for better results

### 3. Testing Cover Sources

The app tries multiple sources in this order:
1. **RAWG API** - Primary source with your API key
2. **OpenCritic API** - Fallback for some games
3. **Local Images** - Checks `./covers/` folder for local images
4. **Placeholder** - Generates a text-based placeholder
5. **IGDB API** - If credentials are configured

### 4. Manual Cover Testing

#### Test RAWG API directly:
```javascript
// Open browser console and run:
fetch('https://api.rawg.io/api/games?key=e0dbb76130754c98a1e7648bbe45103d&search=halo&page_size=1')
  .then(r => r.json())
  .then(d => console.log(d.results[0].background_image))
```

#### Check Local Storage:
```javascript
// Check if API key is stored:
console.log('RAWG API Key:', localStorage.getItem('rawgApiKey'));
console.log('IGDB Client ID:', localStorage.getItem('igdbApiKey'));
console.log('IGDB Token:', localStorage.getItem('igdbAccessToken'));
```

### 5. Network Issues

#### If no covers load at all:
1. Check internet connection
2. Verify firewall isn't blocking the app
3. Try running as administrator
4. Check if antivirus is interfering

#### If only some covers load:
1. This is normal - not all games have covers in the APIs
2. Try different search terms
3. Add local cover images to `./covers/` folder

### 6. Local Cover Images

You can add your own cover images:
1. Create a `covers` folder in the app directory
2. Name images using the game name (lowercase, no special characters)
3. Supported formats: jpg, jpeg, png, webp
4. Example: `tonyhawksproskater.jpg`

### 7. Debug Mode

To enable verbose logging:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for messages starting with:
   - `Fetching from RAWG API:`
   - `RAWG API response:`
   - `Found game cover:`
   - `Cover source X failed:`

### 8. Reset Settings

If covers stop working:
1. Go to Settings
2. Clear API keys
3. Re-enter them
4. Or clear browser storage: `localStorage.clear()`

## Expected Behavior

- **Development mode**: Some CORS errors are normal
- **Packaged app**: All API calls should work
- **Bulk add**: Covers fetch automatically with rate limiting
- **Manual add**: Covers fetch immediately
- **Sync all**: Refreshes all covers (may take time)

## Still Having Issues?

1. Check the main `COVER_TROUBLESHOOTING.md` file
2. Verify your RAWG API key is valid
3. Try the packaged app instead of development mode
4. Check Windows Defender/antivirus logs
5. Run the app as administrator