import React, { useState, useContext } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Play, 
  Settings, 
  Trash2,
  FolderOpen,
  Gamepad2,
  Star,
  Clock,
  HardDrive,
  Eye,
  Globe,
  Heart
} from 'lucide-react';
import { GameContext } from '../context/GameContext';
import { SettingsContext } from '../context/SettingsContext';

const GameLibrary = ({ onGameSelect, onNavigate }) => {
  const { games, addGame, removeGame, updateGame, scanGamesDirectory, toggleFavorite } = useContext(GameContext);
  const { settings } = useContext(SettingsContext);
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [cardSize, setCardSize] = useState(200); // Default card height
  const [newGame, setNewGame] = useState({
    name: '',
    path: '',
    genre: '',
    description: '',
    rating: 0,
    cover: ''
  });

  // Set default RAWG API key if not already set
  React.useEffect(() => {
    const existingKey = localStorage.getItem('rawgApiKey');
    if (!existingKey) {
      localStorage.setItem('rawgApiKey', 'e0dbb76130754c98a1e7648bbe45103d');
      console.log('Set default RAWG API key');
    }
  }, []);

  // Load saved card size from localStorage
  React.useEffect(() => {
    const savedCardSize = localStorage.getItem('cardSize');
    if (savedCardSize) {
      setCardSize(parseInt(savedCardSize));
    }
  }, []);

  // Save card size to localStorage when it changes
   React.useEffect(() => {
     localStorage.setItem('cardSize', cardSize.toString());
   }, [cardSize]);

  const genres = ['Action', 'Adventure', 'RPG', 'Strategy', 'Sports', 'Racing', 'Puzzle', 'Simulation'];

  const filteredGames = games
    .filter(game => 
      game.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterGenre === 'all' || game.genre === filterGenre)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'genre':
          return a.genre.localeCompare(b.genre);
        case 'rating':
          return b.rating - a.rating;
        case 'lastPlayed':
          return new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0);
        default:
          return 0;
      }
    });

  const cleanGameName = (fileName) => {
    // Remove file extension
    let cleanName = fileName.replace(/\.[^/.]+$/, '');
    
    // Remove common patterns like [Region], (Version), etc.
    cleanName = cleanName.replace(/\[.*?\]/g, ''); // Remove [USA], [PAL], etc.
    cleanName = cleanName.replace(/\(.*?\)/g, ''); // Remove (v1.0), (Disc 1), etc.
    cleanName = cleanName.replace(/[-_]/g, ' '); // Replace dashes and underscores with spaces
    cleanName = cleanName.replace(/\s+/g, ' '); // Replace multiple spaces with single space
    cleanName = cleanName.trim();
    
    // Remove common suffixes
    const suffixes = ['XBLA', 'GOD', 'ISO', 'XEX', 'Arcade'];
    suffixes.forEach(suffix => {
      const regex = new RegExp(`\\b${suffix}\\b`, 'gi');
      cleanName = cleanName.replace(regex, '');
    });
    
    return cleanName.trim();
  };

  // Rate limiting for cover fetching
  const coverFetchQueue = React.useRef([]);
  const isFetchingCovers = React.useRef(false);
  
  const fetchGameDetails = async (gameName) => {
    try {
      // Clean the game name for better search results
      const cleanedName = cleanGameName(gameName);
      
      // Try multiple search strategies
      const searchTerms = [
        cleanedName,
        cleanedName.split(' ')[0], // First word only
        gameName // Original name as fallback
      ];
      
      // Try multiple sources for game details
      const detailSources = [
        // Direct API calls (works in Electron environment)
        async (searchTerm) => {
          try {
            // Get API key from localStorage
            const rawgApiKey = localStorage.getItem('rawgApiKey') || 'e0dbb76130754c98a1e7648bbe45103d';
            const apiUrl = `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(searchTerm)}&page_size=1`;
            console.log('Fetching from RAWG API:', apiUrl);
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            console.log('RAWG API response:', data);
            
            if (data.results && data.results.length > 0) {
              const game = data.results[0];
              console.log('Found game details:', { cover: game.background_image, description: game.description_raw });
              return {
                coverUrl: game.background_image,
                description: game.description_raw || game.description || 'No description available',
                genre: game.genres && game.genres.length > 0 ? game.genres[0].name : null,
                rating: game.rating ? Math.round(game.rating) : null
              };
            }
          } catch (error) {
            console.error('RAWG API failed:', error);
          }
          return null;
        },
        
        // Alternative free API - OpenCritic (CORS-friendly)
        async (searchTerm) => {
          try {
            // Try a different approach with a more permissive API
            const cleanSearchTerm = searchTerm.replace(/[^a-zA-Z0-9\s]/g, '').trim();
            const response = await fetch(`https://api.opencritic.com/api/game/search?criteria=${encodeURIComponent(cleanSearchTerm)}`);
            const data = await response.json();
            if (data && data.length > 0 && data[0].images && data[0].images.banner) {
              return data[0].images.banner.og;
            }
          } catch (error) {
            console.log('OpenCritic API failed:', error);
          }
          return null;
        },
        
        // Local image search (check for local cover files)
        async (searchTerm) => {
          try {
            const cleanName = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
            const possibleExtensions = ['jpg', 'jpeg', 'png', 'webp'];
            
            for (const ext of possibleExtensions) {
              try {
                const localPath = `./covers/${cleanName}.${ext}`;
                const response = await fetch(localPath);
                if (response.ok) {
                  return localPath;
                }
              } catch (e) {
                // File doesn't exist, continue
              }
            }
          } catch (error) {
            console.log('Local image search failed:', error);
          }
          return null;
        },
        
        // Fallback: Generate a placeholder based on game name
         async (searchTerm) => {
           try {
             // Create a simple placeholder URL that will be handled by CSS
             return `data:image/svg+xml;base64,${btoa(`
               <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
                 <rect width="100%" height="100%" fill="#2a2a2a"/>
                 <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
                   ${searchTerm.substring(0, 20)}${searchTerm.length > 20 ? '...' : ''}
                 </text>
               </svg>
             `)}`;
           } catch (error) {
             console.log('Placeholder generation failed:', error);
           }
           return null;
         },
         
         // IGDB API (requires API key)
        async (searchTerm) => {
          try {
            const igdbClientId = localStorage.getItem('igdbApiKey');
            const igdbAccessToken = localStorage.getItem('igdbAccessToken');
            console.log('IGDB credentials check:', { hasClientId: !!igdbClientId, hasToken: !!igdbAccessToken });
            
            if (!igdbClientId || !igdbAccessToken) {
              console.log('IGDB API skipped - missing credentials');
              return null;
            }
            
            console.log('Fetching from IGDB API for:', searchTerm);
            const response = await fetch('https://api.igdb.com/v4/games', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Client-ID': igdbClientId,
                'Authorization': `Bearer ${igdbAccessToken}`,
              },
              body: `search "${searchTerm}"; fields name,cover.url; limit 1;`
            });
            const data = await response.json();
            console.log('IGDB API response:', data);
            
            if (data && data.length > 0 && data[0].cover) {
              const coverUrl = `https:${data[0].cover.url.replace('t_thumb', 't_cover_big')}`;
              console.log('Found IGDB cover:', coverUrl);
              return coverUrl;
            }
          } catch (error) {
            console.error('IGDB API failed:', error);
          }
          return null;
        }
      ];
      
      // Try each search term with each detail source
      for (const searchTerm of searchTerms) {
        console.log(`Searching for game details for: "${searchTerm}"`);
        for (let i = 0; i < detailSources.length; i++) {
          const source = detailSources[i];
          try {
            const gameDetails = await source(searchTerm);
            if (gameDetails) {
              console.log(`Found game details for "${searchTerm}" from source ${i + 1}:`, gameDetails);
              return gameDetails;
            }
          } catch (error) {
            console.log(`Detail source ${i + 1} failed for "${searchTerm}":`, error);
            continue;
          }
          
          // Add small delay between sources to avoid overwhelming APIs
          if (i < detailSources.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching game details:', error);
      return null;
    }
  };
  
  const processDetailsQueue = async () => {
    if (isFetchingCovers.current || coverFetchQueue.current.length === 0) return;
    
    isFetchingCovers.current = true;
    
    while (coverFetchQueue.current.length > 0) {
      const { gameId, gameName, resolve } = coverFetchQueue.current.shift();
      try {
        const gameDetails = await fetchGameDetails(gameName);
        resolve(gameDetails);
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        resolve(null);
      }
    }
    
    isFetchingCovers.current = false;
  };
  
  const queueDetailsFetch = (gameId, gameName) => {
    return new Promise((resolve) => {
      coverFetchQueue.current.push({ gameId, gameName, resolve });
      processDetailsQueue();
    });
  };

  const syncAllCovers = async () => {
    if (games.length === 0) {
      alert('No games to sync covers for.');
      return;
    }

    const confirmed = window.confirm(`This will refresh covers for all ${games.length} games. This may take a while. Continue?`);
    if (!confirmed) return;

    setIsScanning(true);
    let updatedCount = 0;

    try {
      for (let i = 0; i < games.length; i++) {
        const game = games[i];
        console.log(`Syncing cover for game ${i + 1}/${games.length}: ${game.name}`);
        
        const gameDetails = await fetchGameDetails(game.name);
        if (gameDetails) {
          const updateData = {};
          if (gameDetails.coverUrl) updateData.coverUrl = gameDetails.coverUrl;
          if (gameDetails.description) updateData.description = gameDetails.description;
          if (gameDetails.genre && (!game.genre || game.genre === 'Unknown')) updateData.genre = gameDetails.genre;
          if (gameDetails.rating && !game.rating) updateData.rating = gameDetails.rating;
          
          if (Object.keys(updateData).length > 0) {
            updateGame(game.id, updateData);
            updatedCount++;
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      alert(`Cover sync completed! Updated ${updatedCount} out of ${games.length} games.`);
    } catch (error) {
      console.error('Error syncing covers:', error);
      alert('Error occurred while syncing covers. Check console for details.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddGame = async () => {
    try {
      // Use multiple file selection for bulk adding
      const gamePaths = await window.electronAPI.selectMultipleGameFiles();
      if (gamePaths && gamePaths.length > 0) {
        if (gamePaths.length === 1) {
          // Single file - show modal for editing
          const gamePath = gamePaths[0];
          const validation = await window.electronAPI.validateGameFile(gamePath);
          if (validation.valid) {
            const fileName = gamePath.split('\\').pop().split('/').pop();
            const gameName = fileName.replace(/\.[^/.]+$/, '');
            
            // Fetch game details automatically
            console.log('Fetching details for game:', gameName);
            const gameDetails = await queueDetailsFetch(Date.now().toString(), gameName);
            console.log('Fetched game details:', gameDetails);
            
            setNewGame({
              name: gameName,
              path: gamePath,
              genre: gameDetails?.genre || 'Unknown',
              description: gameDetails?.description || '',
              rating: gameDetails?.rating || 0,
              cover: gameDetails?.coverUrl || ''
            });
            setShowAddGameModal(true);
          } else {
            window.electronAPI.showMessageBox({
              type: 'error',
              title: 'Invalid Game File',
              message: `The selected file is not a valid game file:\n\n${validation.error}`,
              buttons: ['OK']
            });
          }
        } else {
          // Multiple files - process as bulk add
          setSelectedFiles(gamePaths);
          setShowBulkAddModal(true);
        }
      }
    } catch (error) {
      console.error('Error adding game:', error);
    }
  };

  const handleBulkAddGames = async () => {
    try {
      console.log('Bulk add button clicked');
      const gamePaths = await window.electronAPI.selectMultipleGameFiles();
      console.log('Selected game paths:', gamePaths);
      if (gamePaths && gamePaths.length > 0) {
        setSelectedFiles(gamePaths);
        setShowBulkAddModal(true);
        console.log('Bulk add modal should now be visible');
      } else {
        console.log('No files selected or selection cancelled');
      }
    } catch (error) {
      console.error('Error selecting multiple games:', error);
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Selection Error',
        message: `Error selecting multiple games: ${error.message}`,
        buttons: ['OK']
      });
    }
  };

  const processBulkGames = async () => {
    setIsProcessingBulk(true);
    let addedCount = 0;
    
    for (const gamePath of selectedFiles) {
      try {
        const validation = await window.electronAPI.validateGameFile(gamePath);
        if (validation.valid) {
          const fileName = gamePath.split('\\').pop().split('/').pop();
          const gameName = fileName.replace(/\.[^/.]+$/, '');
          
          // Fetch game details automatically with rate limiting
          console.log(`Fetching details for bulk game ${addedCount + 1}/${selectedFiles.length}:`, gameName);
          const gameDetails = await queueDetailsFetch(Date.now().toString() + Math.random(), gameName);
          console.log('Fetched game details:', gameDetails);
          
          addGame({
            id: Date.now().toString() + Math.random(),
            name: gameName,
            path: gamePath,
            genre: gameDetails?.genre || 'Unknown',
            description: gameDetails?.description || '',
            rating: gameDetails?.rating || 0,
            cover: gameDetails?.coverUrl || '',
            dateAdded: new Date().toISOString(),
            timesPlayed: 0
          });
          addedCount++;
        }
      } catch (error) {
        console.error('Error processing game:', gamePath, error);
      }
    }
    
    setIsProcessingBulk(false);
    setShowBulkAddModal(false);
    setSelectedFiles([]);
    
    await window.electronAPI.showMessageBox({
      type: 'info',
      title: 'Bulk Add Complete',
      message: `Successfully added ${addedCount} out of ${selectedFiles.length} games to your library.`,
      buttons: ['OK']
    });
  };

  const handleScanDirectory = async () => {
    try {
      const directory = await window.electronAPI.selectDirectory();
      if (directory) {
        setIsScanning(true);
        
        const newGames = await scanGamesDirectory(directory);
        
        await window.electronAPI.showMessageBox({
          type: 'info',
          title: 'Scan Complete',
          message: `Found and added ${newGames.length} new games to your library.`,
          buttons: ['OK']
        });
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Scan Failed',
        message: `Failed to scan directory: ${error.message}`,
        buttons: ['OK']
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveGame = () => {
    if (newGame.name && newGame.path) {
      addGame({
        ...newGame,
        id: Date.now().toString(),
        dateAdded: new Date().toISOString(),
        timesPlayed: 0
      });
      setNewGame({ name: '', path: '', genre: '', description: '', rating: 0, cover: '' });
      setShowAddGameModal(false);
    }
  };

  const handleLaunchGame = async (game) => {
    if (!window.electronAPI || !settings.emulatorPath) {
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Emulator Not Configured',
        message: 'Please configure the emulator first in the Setup section.',
        buttons: ['OK']
      });
      return;
    }

    // Validate emulator and game before launching
    const emulatorValidation = await window.electronAPI.validateEmulator(settings.emulatorPath);
    if (!emulatorValidation.valid) {
      window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Emulator Error',
        message: `Emulator is not valid or accessible:\n\n${emulatorValidation.error}\n\nPlease reconfigure the emulator in Settings.`,
        buttons: ['OK']
      });
      return;
    }

    const gameValidation = await window.electronAPI.validateGameFile(game.path);
    if (!gameValidation.valid) {
      window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Game File Error',
        message: `Game file is not valid or accessible:\n\n${gameValidation.error}\n\nThe game file may have been moved, deleted, or corrupted.`,
        buttons: ['OK']
      });
      return;
    }

    try {
      // Use game-specific config if available, otherwise fall back to default settings
      const gameConfig = game.config || {};
      const launchConfig = {
        fullscreen: gameConfig.fullscreen !== undefined ? gameConfig.fullscreen : (settings.defaultFullscreen || false),
        resolution: gameConfig.resolution || settings.defaultResolution || 'auto',
        renderer: gameConfig.renderer || settings.defaultRenderer || 'auto',
        audioDriver: gameConfig.audioDriver || settings.defaultAudioDriver || 'auto',
        vsync: gameConfig.vsync !== undefined ? gameConfig.vsync : true,
        antialiasing: gameConfig.antialiasing || 'auto',
        textureFiltering: gameConfig.textureFiltering || 'auto',
        frameLimit: gameConfig.frameLimit || 'auto',
        audioLatency: gameConfig.audioLatency || 'auto',
        showFPS: gameConfig.showFPS !== undefined ? gameConfig.showFPS : settings.showFPS,
        customArgs: gameConfig.customArgs || ''
      };
      
      const result = await window.electronAPI.launchGame(settings.emulatorPath, game.path, launchConfig);
      
      // Update game stats
      updateGame(game.id, {
        lastPlayed: new Date().toISOString(),
        timesPlayed: (game.timesPlayed || 0) + 1
      });
    } catch (error) {
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Launch Failed',
        message: `Failed to launch game: ${error.message}`,
        buttons: ['OK']
      });
    }
  };

  const GameCard = ({ game, cardSize = 120 }) => {
    const [isLaunching, setIsLaunching] = React.useState(false);
    const [coverFetched, setCoverFetched] = React.useState(!!game.coverUrl);
    
    // Auto-fetch cover if missing (with rate limiting)
    React.useEffect(() => {
      if ((!game.coverUrl || !game.description || game.description === 'Auto-detected game') && !coverFetched) {
        setCoverFetched(true);
        queueDetailsFetch(game.id, game.name).then(gameDetails => {
          if (gameDetails) {
            const updateData = {};
            if (gameDetails.coverUrl) updateData.coverUrl = gameDetails.coverUrl;
            if (gameDetails.description) updateData.description = gameDetails.description;
            if (gameDetails.genre && (!game.genre || game.genre === 'Unknown')) updateData.genre = gameDetails.genre;
            if (gameDetails.rating && !game.rating) updateData.rating = gameDetails.rating;
            
            if (Object.keys(updateData).length > 0) {
              updateGame(game.id, updateData);
            }
          }
        });
      }
    }, [game.id, game.coverUrl, game.description, coverFetched]);
    
    const coverWidth = Math.max(60, cardSize * 0.75); // Cover width scales with card size
    const fontSize = Math.max(10, cardSize * 0.12); // Font size scales with card size
    const titleFontSize = Math.max(12, cardSize * 0.14);
    
    return (
      <div 
        className="game-card" 
        style={{
          height: `${cardSize}px`,
          fontSize: `${fontSize}px`
        }}
        onClick={async (e) => {
          if (isLaunching) return;
          setIsLaunching(true);
          try {
            await handleLaunchGame(game);
          } finally {
            setIsLaunching(false);
          }
        }}>
        <div 
          className="game-cover"
          style={{
            width: `${coverWidth}px`,
            fontSize: `${Math.max(16, cardSize * 0.15)}px`
          }}
        >
          {game.coverUrl ? (
            <img 
              src={game.coverUrl} 
              alt={game.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <Gamepad2 size={20} />
          )}
        </div>
        <div className="game-info">
          <div 
            className="game-title"
            style={{
              fontSize: `${titleFontSize}px`,
              lineHeight: cardSize < 100 ? '1.2' : '1.3'
            }}
          >
            {game.name}
          </div>
          <div className="game-meta">
            <div style={{ marginBottom: '4px' }}>
              <span>{game.genre || 'Unknown'}</span>
              {game.rating > 0 && (
                <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <Star size={10} color="#fbbf24" fill="#fbbf24" />
                  <span>{game.rating}</span>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
              {game.timesPlayed > 0 && (
                <span style={{ color: '#64748b' }}>
                  Played {game.timesPlayed} times
                </span>
              )}
              {game.lastPlayed && (
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Clock size={8} />
                  {new Date(game.lastPlayed).toLocaleDateString()}
                </span>
              )}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
              <button 
                className={`btn btn-sm ${game.isFavorite ? 'btn-warning' : 'btn-secondary'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(game.id);
                }}
                style={{ padding: '8px 12px', fontSize: '12px', minWidth: '40px' }}
                title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart size={14} fill={game.isFavorite ? 'currentColor' : 'none'} />
              </button>
              <button 
                className="btn btn-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onGameSelect(game);
                  onNavigate('config');
                }}
                style={{ padding: '8px 12px', fontSize: '12px', minWidth: '40px' }}
                title="Configure game"
              >
                <Settings size={14} />
              </button>
              <button 
                className="btn btn-danger"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to remove "${game.name}" from your library?`)) {
                    removeGame(game.id);
                  }
                }}
                style={{ padding: '8px 12px', fontSize: '12px', minWidth: '40px' }}
                title="Remove game"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GameListItem = ({ game }) => (
    <div className="card" style={{ padding: '16px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Gamepad2 size={24} color="white" />
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '4px' }}>{game.name}</h3>
          <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
            {game.genre || 'Unknown Genre'} • {game.timesPlayed || 0} plays
          </div>
          <div style={{ color: '#64748b', fontSize: '12px' }}>
            {game.path}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {game.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={14} color="#fbbf24" fill="#fbbf24" />
              <span style={{ color: '#fbbf24', fontSize: '14px' }}>{game.rating}</span>
            </div>
          )}
          
          <button 
            className="btn btn-primary"
            onClick={() => handleLaunchGame(game)}
          >
            <Play size={16} />
            Play
          </button>
          
          <button 
            className={`btn ${game.isFavorite ? 'btn-warning' : 'btn-secondary'}`}
            onClick={() => toggleFavorite(game.id)}
            title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart size={16} fill={game.isFavorite ? 'currentColor' : 'none'} />
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => {
              onGameSelect(game);
              onNavigate('config');
            }}
          >
            <Settings size={16} />
          </button>
          
          <button 
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm('Are you sure you want to remove this game from your library?')) {
                removeGame(game.id);
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Game Library
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>
          Manage your game collection and launch games with ease
        </p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
          
          <select 
            className="form-select"
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            style={{ minWidth: '120px' }}
          >
            <option value="all">All Genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
          
          <select 
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ minWidth: '120px' }}
          >
            <option value="name">Sort by Name</option>
            <option value="genre">Sort by Genre</option>
            <option value="rating">Sort by Rating</option>
            <option value="lastPlayed">Sort by Last Played</option>
          </select>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={16} />
            </button>
            <button 
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </button>
          </div>
          
          {/* Card Size Control */}
          {viewMode === 'grid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>Card Size:</span>
              <input 
                type="range" 
                min="80" 
                max="200" 
                value={cardSize} 
                onChange={(e) => setCardSize(parseInt(e.target.value))}
                style={{
                  flex: 1,
                  height: '4px',
                  background: 'rgba(139, 92, 246, 0.3)',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', minWidth: '30px' }}>{cardSize}px</span>
            </div>
          )}
          
          <button 
            className="btn btn-success"
            onClick={handleAddGame}
          >
            <Plus size={16} />
            Add Games
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={handleScanDirectory}
            disabled={isScanning}
          >
            <FolderOpen size={16} />
            {isScanning ? 'Scanning...' : 'Scan Directory'}
          </button>
          
          <button 
            className="btn btn-warning"
            onClick={syncAllCovers}
            disabled={isScanning}
          >
            <Globe size={16} />
            {isScanning ? 'Syncing...' : 'Sync Covers'}
          </button>
        </div>
      </div>

      {/* Games Display */}
      {filteredGames.length > 0 ? (
        <div 
          className={viewMode === 'grid' ? 'grid-dynamic' : ''}
          style={viewMode === 'grid' ? {
            '--card-min-width': `${Math.max(150, cardSize * 1.5)}px`
          } : {}}
        >
          {filteredGames.map(game => 
            viewMode === 'grid' ? (
              <GameCard key={game.id} game={game} cardSize={cardSize} />
            ) : (
              <GameListItem key={game.id} game={game} />
            )
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Gamepad2 size={64} style={{ color: '#64748b', marginBottom: '16px' }} />
          <h3 style={{ color: '#94a3b8', marginBottom: '8px' }}>
            {searchTerm || filterGenre !== 'all' ? 'No Games Found' : 'No Games in Library'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            {searchTerm || filterGenre !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Add games to your library to get started'
            }
          </p>
          {!searchTerm && filterGenre === 'all' && (
            <button 
              className="btn btn-primary"
              onClick={handleAddGame}
            >
              <Plus size={16} />
              Add Your First Game
            </button>
          )}
        </div>
      )}

      {/* Add Game Modal */}
      {showAddGameModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '500px', maxWidth: '90vw' }}>
            <div className="card-header">
              <h3 className="card-title">
                <Plus size={24} />
                Add New Game
              </h3>
            </div>
            
            <div className="form-group">
              <label className="form-label">Game Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={newGame.name}
                onChange={(e) => setNewGame({...newGame, name: e.target.value})}
                placeholder="Enter game name..."
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Genre</label>
              <select 
                className="form-select"
                value={newGame.genre}
                onChange={(e) => setNewGame({...newGame, genre: e.target.value})}
              >
                <option value="">Select genre...</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Rating (1-5)</label>
              <input 
                type="number" 
                className="form-input" 
                min="0" 
                max="5" 
                value={newGame.rating}
                onChange={(e) => setNewGame({...newGame, rating: parseInt(e.target.value) || 0})}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Cover Image URL</label>
              <input 
                type="url" 
                className="form-input" 
                value={newGame.cover}
                onChange={(e) => setNewGame({...newGame, cover: e.target.value})}
                placeholder="Cover image URL (auto-fetched if available)..."
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea 
                className="form-input" 
                rows="3"
                value={newGame.description}
                onChange={(e) => setNewGame({...newGame, description: e.target.value})}
                placeholder="Optional description..."
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAddGameModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success"
                onClick={handleSaveGame}
                disabled={!newGame.name || !newGame.path}
                style={{ flex: 1 }}
              >
                Add Game
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Add Games Modal */}
      {showBulkAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '600px', maxWidth: '90vw' }}>
            <div className="card-header">
              <h3 className="card-title">
                <Plus size={24} />
                Bulk Add Games
              </h3>
            </div>
            
            <div style={{ padding: '20px' }}>
              <p>Selected {selectedFiles.length} game files:</p>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid #374151', 
                borderRadius: '8px', 
                padding: '12px',
                marginBottom: '20px'
              }}>
                {selectedFiles.map((file, index) => {
                  const fileName = file.split('\\').pop().split('/').pop();
                  return (
                    <div key={index} style={{ 
                      padding: '4px 0', 
                      borderBottom: index < selectedFiles.length - 1 ? '1px solid #374151' : 'none'
                    }}>
                      {fileName}
                    </div>
                  );
                })}
              </div>
              
              <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
                Game covers will be automatically fetched for each game.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', padding: '20px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowBulkAddModal(false);
                  setSelectedFiles([]);
                }}
                style={{ flex: 1 }}
                disabled={isProcessingBulk}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success"
                onClick={processBulkGames}
                disabled={isProcessingBulk || selectedFiles.length === 0}
                style={{ flex: 1 }}
              >
                {isProcessingBulk ? 'Processing...' : `Add ${selectedFiles.length} Games`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLibrary;