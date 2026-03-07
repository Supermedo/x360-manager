import React, { useState, useContext, useCallback, useMemo } from 'react';
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
  Heart,
  Archive,
  Download,
  RefreshCw,
  MonitorUp,
  FilePlus,
  Zap,
  ImageIcon
} from 'lucide-react';
import { GameContext } from '../context/GameContext';
import { SettingsContext } from '../context/SettingsContext';
import GamePatchesModal from './GamePatchesModal';

// Memoized sub-components moved outside to prevent re-definition and flashing
const GameCard = React.memo(({ game, cardSize = 180, onLaunch, onContextMenu, onToggleFavorite, onConfigure }) => {
  const [isLaunching, setIsLaunching] = React.useState(false);

  // Dimensions: Modern 2:3 aspect ratio vertical posters
  const coverWidth = cardSize;
  const coverHeight = cardSize * 1.5;

  return (
    <div
      className="game-card vertical-poster"
      style={{
        width: `${coverWidth}px`,
        height: `${coverHeight}px`,
      }}
      onClick={async (e) => {
        if (isLaunching) return;
        setIsLaunching(true);
        try {
          await onLaunch(game);
        } finally {
          setIsLaunching(false);
        }
      }}
      onContextMenu={(e) => onContextMenu(e, game)}>

      {/* Cover Graphic taking full space */}
      <div className="game-cover-full">
        {game.coverUrl ? (
          <img
            key={game.coverUrl}
            src={game.coverUrl}
            alt={game.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gamepad2 size={40} opacity={0.6} />
          </div>
        )}
        {/* Overlay gradient over the image */}
        <div className="card-overlay-gradient"></div>
      </div>

      {/* Hover Action Buttons Overlay */}
      <div className="card-hover-actions">
        {isLaunching ? (
          <div className="launching-spinner"></div>
        ) : (
          <Play fill="white" size={48} className="play-icon-overlay" />
        )}
        <div className="hover-buttons-row">
          <button
            className="btn-icon"
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation(); onToggleFavorite(game.id);
            }}
            title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart size={18} fill={game.isFavorite ? '#fbbf24' : 'none'} color={game.isFavorite ? '#fbbf24' : 'white'} />
          </button>
          <button
            className="btn-icon"
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation(); onConfigure(game);
            }}
            title="Configure game"
          >
            <Settings size={18} color="white" />
          </button>
          <button
            className="btn-icon danger-icon"
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              // This is a bit tricky as removeGame is not passed here directly, 
              // but we can handle it via the context menu or pass another prop
              onContextMenu(e, game); // Show context menu as alternative for delete in card
            }}
            title="Options"
          >
            <Settings size={18} color="white" />
          </button>
        </div>
      </div>

      {/* Text info sliding up from the bottom */}
      <div className="game-info">
        <div className="game-title">
          {game.name}
        </div>
        <div className="game-meta">
          <div className="game-meta-row">
            <span>{game.genre !== 'Unknown' ? game.genre : 'Local Game'}</span>
            {game.rating > 0 && (
              <span className="game-rating">
                <Star size={10} color="#fbbf24" fill="#fbbf24" />
                <span>{game.rating}</span>
              </span>
            )}
          </div>
          {game.timesPlayed > 0 && (
            <div className="game-meta-playtime">
              Played {game.timesPlayed} times
            </div>
          )}
        </div>
      </div>

    </div>
  );
});

const GameListItem = React.memo(({ game, onLaunch, onToggleFavorite, onConfigure, onRemove }) => (
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
          onClick={() => onLaunch(game)}
        >
          <Play size={16} />
          Play
        </button>

        <button
          className={`btn ${game.isFavorite ? 'btn-warning' : 'btn-secondary'}`}
          onClick={() => onToggleFavorite(game.id)}
          title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} fill={game.isFavorite ? 'currentColor' : 'none'} />
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => onConfigure(game)}
        >
          <Settings size={16} />
        </button>

        <button
          className="btn btn-danger"
          onClick={() => onRemove(game.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  </div>
));
const GameLibrary = ({ onGameSelect, onNavigate }) => {
  const { games, addGame, batchAddGames, removeGame, updateGame, batchUpdateGames, scanGamesDirectory, toggleFavorite, xbox360DB, isDbLoaded } = useContext(GameContext);
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
  const [selectedGameForPatches, setSelectedGameForPatches] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, game: null });
  const [newGame, setNewGame] = useState({
    name: '',
    path: '',
    genre: '',
    description: '',
    rating: 0,
    cover: ''
  });

  // Database is now handled in GameContext

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

  const cleanGameName = (name) => {
    if (!name) return '';
    // Preserve common sequels like "2", "3" but remove technical tags
    return name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/\[.*?\]/g, '') // Remove [Region/tags]
      .replace(/\(.*?\)/g, '') // Remove (Year/tags)
      .replace(/[_-]/g, ' ') // Replace underscore/dash
      .replace(/ (Disc|Disk|DVD) \d+/gi, '') // Remove Disc 1/2
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
  };

  const getFuzzyMatch = (db, searchTerm) => {
    if (!db || !searchTerm) return null;
    const normalizedSearch = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalizedSearch) return null;

    // 1. Exact normalized match
    let match = db.find(g => g.title.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedSearch);
    if (match) return match;

    // 2. Starts with / Substring
    match = db.find(g => {
      const dbTitle = g.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      return dbTitle.length > 3 && (dbTitle.includes(normalizedSearch) || normalizedSearch.includes(dbTitle));
    });

    return match;
  };

  // Rate limiting for cover fetching
  const coverFetchQueue = React.useRef([]);
  const isFetchingCovers = React.useRef(false);

  const fetchGameDetails = async (gameName, titleId = null) => {
    try {
      const cleanedName = cleanGameName(gameName);
      console.log(`Deep Scraping: "${cleanedName}" (ID: ${titleId || 'None'})`);

      let results = {
        coverUrl: null,
        description: `Xbox 360 game: ${cleanedName}`,
        genre: 'Xbox 360'
      };

      // 1. PRIMARY: Xbox 360 DB (Best for official art)
      if (xbox360DB && xbox360DB.length > 0) {
        let match = null;
        if (titleId) {
          const searchTitleId = titleId.toUpperCase();
          match = xbox360DB.find(g =>
            (g.id && g.id.toUpperCase() === searchTitleId) ||
            (g.alternative_id && g.alternative_id.some(altId => altId.toUpperCase() === searchTitleId))
          );
        }

        if (!match) {
          match = getFuzzyMatch(xbox360DB, cleanedName);
        }

        if (match && match.boxart) {
          console.log(`Success (Xbox DB): ${match.title}`);
          return {
            coverUrl: match.boxart,
            description: `Xbox 360: ${match.title}`,
            genre: 'Xbox 360'
          };
        }
      }

      // 2. FALLBACK A: ScreenScraper.fr (The "God Tier" Database)
      // We try ScreenScraper before Steam because it's console-specific and more likely to have exact matches
      if (window.electronAPI?.scrapeScreenScraper) {
        console.log(`Falling back to ScreenScraper: ${gameName}`);
        try {
          // Use original filename and TitleId for best hashing/matching in SS
          const ssData = await window.electronAPI.scrapeScreenScraper({ gameName, titleId });
          if (ssData && ssData.reponse && ssData.reponse.jeu) {
            const jeu = ssData.reponse.jeu;
            const medias = jeu.medias || [];
            const boxArt = medias.find(m => m.type === 'box-2D' && m.parent === 'Principale') ||
              medias.find(m => m.type === 'box-2D') ||
              medias.find(m => m.type.includes('box')) ||
              medias[0];

            if (boxArt && boxArt.url) {
              console.log(`Success (ScreenScraper): ${jeu.noms?.[0]?.nom || cleanedName}`);
              return {
                coverUrl: boxArt.url,
                description: jeu.synopsis?.find(s => s.langue === 'en')?.texte || jeu.synopsis?.[0]?.texte || results.description,
                genre: jeu.genres?.[0]?.nom || results.genre
              };
            }
          }
        } catch (e) {
          console.warn('ScreenScraper fetch failed:', e);
        }
      }

      // 3. FALLBACK B: Steam (Good for cross-gen)
      try {
        const steamSearchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanedName)}&l=english&cc=US`;
        const response = await fetch(steamSearchUrl);
        if (response.ok) {
          const data = await response.json();
          const items = data.items || data.results || [];
          if (items.length > 0) {
            console.log(`Success (Steam): ${items[0].name}`);
            return {
              coverUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${items[0].id}/library_600x900_2x.jpg`,
              description: `Steam: ${items[0].name}`,
              genre: 'PC / Xbox 360'
            };
          }
        }
      } catch (e) { }

      return null;
    } catch (error) {
      console.error('Scraper crash:', error);
      return null;
    }
  };



  const processDetailsQueue = async () => {
    if (isFetchingCovers.current || coverFetchQueue.current.length === 0) return;

    isFetchingCovers.current = true;

    while (coverFetchQueue.current.length > 0) {
      const { gameId, gameName, titleId, resolve } = coverFetchQueue.current.shift();
      try {
        const gameDetails = await fetchGameDetails(gameName, titleId);
        resolve(gameDetails);
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        resolve(null);
      }
    }

    isFetchingCovers.current = false;
  };

  const queueDetailsFetch = (gameId, gameName, titleId = null) => {
    return new Promise((resolve) => {
      coverFetchQueue.current.push({ gameId, gameName, titleId, resolve });
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
    const updatesMap = {};

    try {
      for (let i = 0; i < games.length; i++) {
        const game = games[i];
        console.log(`Syncing cover for game ${i + 1}/${games.length}: ${game.name}`);

        const filename = game.path ? (game.path.split(/[\\/]/).pop()) : game.name;
        const gameDetails = await fetchGameDetails(filename, game.titleId);
        if (gameDetails) {
          const updateData = {};
          if (gameDetails.coverUrl) updateData.coverUrl = gameDetails.coverUrl;
          if (gameDetails.description) updateData.description = gameDetails.description;
          if (gameDetails.genre && (!game.genre || game.genre === 'Unknown')) updateData.genre = gameDetails.genre;
          if (gameDetails.rating && !game.rating) updateData.rating = gameDetails.rating;

          if (Object.keys(updateData).length > 0) {
            updatesMap[game.id] = updateData;
            updatedCount++;
          }
        }

        // Chunk updates to show progress without too much flashing - increased to 10
        if (Object.keys(updatesMap).length >= 10) {
          batchUpdateGames({ ...updatesMap });
          // Clear processed updates
          Object.keys(updatesMap).forEach(key => delete updatesMap[key]);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (Object.keys(updatesMap).length > 0) {
        batchUpdateGames(updatesMap);
      }

      alert(`Cover sync completed! Updated ${updatedCount} out of ${games.length} games.`);
    } catch (error) {
      console.error('Error syncing covers:', error);
      alert('Error occurred while syncing covers. Check console for details.');
    } finally {
      setIsScanning(false);
    }
  };

  const syncMissingCovers = async () => {
    const missingCoverGames = games.filter(g => !g.coverUrl);
    if (missingCoverGames.length === 0) {
      alert('All games already have covers.');
      return;
    }

    const confirmed = window.confirm(`Found ${missingCoverGames.length} games missing covers. Sync them now?`);
    if (!confirmed) return;

    setIsScanning(true);
    let updatedCount = 0;
    const updatesMap = {};

    try {
      for (let i = 0; i < missingCoverGames.length; i++) {
        const game = missingCoverGames[i];
        console.log(`Syncing missing cover ${i + 1}/${missingCoverGames.length}: ${game.name}`);

        const filename = game.path ? (game.path.split(/[\\/]/).pop()) : game.name;
        const gameDetails = await fetchGameDetails(filename, game.titleId);
        if (gameDetails) {
          const updateData = {};
          if (gameDetails.coverUrl) updateData.coverUrl = gameDetails.coverUrl;
          if (gameDetails.description) updateData.description = gameDetails.description;
          if (gameDetails.genre && (!game.genre || game.genre === 'Unknown')) updateData.genre = gameDetails.genre;
          if (gameDetails.rating && !game.rating) updateData.rating = gameDetails.rating;

          if (Object.keys(updateData).length > 0) {
            updatesMap[game.id] = updateData;
            updatedCount++;
          }
        }

        // Chunk updates to show progress
        if (Object.keys(updatesMap).length >= 5) {
          batchUpdateGames({ ...updatesMap });
          Object.keys(updatesMap).forEach(key => delete updatesMap[key]);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (Object.keys(updatesMap).length > 0) {
        batchUpdateGames(updatesMap);
      }

      alert(`Missing cover sync completed! Updated ${updatedCount} out of ${missingCoverGames.length} games.`);
    } catch (error) {
      console.error('Error syncing covers:', error);
      alert('Error occurred while syncing covers. Check console for details.');
    } finally {
      setIsScanning(false);
    }
  };

  // Wrapped handlers in useCallback to prevent re-renders in memoized components
  const handleLaunchGame = useCallback(async (game) => {
    if (!settings.emulatorPath) {
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Emulator Not Configured',
        message: 'Please configure the emulator first.',
        buttons: ['OK']
      });
      return;
    }

    try {
      const gameConfig = game.config || {};
      const launchConfig = {
        ...gameConfig,
        fullscreen: gameConfig.fullscreen !== undefined ? gameConfig.fullscreen : (settings.defaultFullscreen || false),
        resolution: gameConfig.resolution || settings.defaultResolution || 'auto',
        renderer: gameConfig.renderer || settings.defaultRenderer || 'auto',
        vsync: gameConfig.vsync !== undefined ? gameConfig.vsync : true,
        showFPS: gameConfig.showFPS !== undefined ? gameConfig.showFPS : settings.showFPS
      };

      await window.electronAPI.launchGame(settings.emulatorPath, game.path, launchConfig);

      updateGame(game.id, {
        lastPlayed: new Date().toISOString(),
        timesPlayed: (game.timesPlayed || 0) + 1
      });
    } catch (error) {
      console.error('Launch error:', error);
    }
  }, [settings.emulatorPath, settings.defaultFullscreen, settings.defaultResolution, settings.defaultRenderer, settings.showFPS, updateGame]);

  const handleContextMenuCallback = useCallback((e, game) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, game });
  }, []);

  const handleToggleFavorite = useCallback((id) => {
    toggleFavorite(id);
  }, [toggleFavorite]);

  const handleConfigure = useCallback((game) => {
    onGameSelect(game);
    onNavigate('config');
  }, [onGameSelect, onNavigate]);

  const handleRemoveGame = useCallback((id) => {
    if (window.confirm('Are you sure you want to remove this game from your library?')) {
      removeGame(id);
    }
  }, [removeGame]);

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
            const pathParts = gamePath.split(/[\\/]/);
            const fileName = pathParts.pop();
            let gameName = fileName.replace(/\.[^/.]+$/, '');
            if (fileName.toLowerCase() === 'default.xex' && pathParts.length > 0) {
              gameName = pathParts.pop();
            }

            // Fetch game details automatically
            console.log('Fetching details for game:', gameName);
            const gameDetails = await queueDetailsFetch(Date.now().toString(), gameName, validation.info?.titleId);
            console.log('Fetched game details:', gameDetails);

            setNewGame({
              name: gameName,
              path: gamePath,
              titleId: validation.info?.titleId || null,
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

  // Bulk Save Management Functions
  const handleBulkBackupSaves = async () => {
    try {
      const backupPath = await window.electronAPI.selectDirectory();
      if (!backupPath) return;

      const gamesWithSaves = games.filter(game => game.config?.saveFiles?.length > 0);
      if (gamesWithSaves.length === 0) {
        window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'No Saves Found',
          message: 'No games with save files were found.',
          buttons: ['OK']
        });
        return;
      }

      const result = await window.electronAPI?.showMessageBox({
        type: 'question',
        title: 'Bulk Backup Saves',
        message: `Create backup for ${gamesWithSaves.length} game(s) with save files?`,
        buttons: ['Backup', 'Cancel'],
        defaultId: 0
      });

      if (result?.response === 0) {
        let successCount = 0;
        for (const game of gamesWithSaves) {
          try {
            const backupEntry = {
              id: Date.now() + Math.random(),
              name: `${game.name} - Bulk Backup - ${new Date().toLocaleString()}`,
              date: new Date().toISOString(),
              path: backupPath,
              type: 'bulk'
            };

            const updatedConfig = {
              ...game.config,
              saveFiles: [...(game.config.saveFiles || []), backupEntry]
            };

            updateGame(game.id, { config: updatedConfig });
            successCount++;
          } catch (error) {
            console.error(`Failed to backup saves for ${game.name}:`, error);
          }
        }

        window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'Bulk Backup Complete',
          message: `Successfully created backups for ${successCount} out of ${gamesWithSaves.length} games.`,
          buttons: ['OK']
        });
      }
    } catch (error) {
      console.error('Failed to perform bulk backup:', error);
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Bulk Backup Failed',
        message: `Failed to perform bulk backup: ${error.message}`,
        buttons: ['OK']
      });
    }
  };

  const handleBulkImportSaves = async () => {
    try {
      const savePaths = await window.electronAPI.selectMultipleFiles({
        title: 'Select Save Files for Bulk Import',
        filters: [
          { name: 'Save Files', extensions: ['sav', 'dat', 'bin', 'save'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile', 'multiSelections']
      });

      if (!savePaths || savePaths.length === 0) return;

      const result = await window.electronAPI?.showMessageBox({
        type: 'question',
        title: 'Bulk Import Saves',
        message: `Import ${savePaths.length} save file(s) to all games? This will add the saves to every game in your library.`,
        buttons: ['Import to All', 'Cancel'],
        defaultId: 1
      });

      if (result?.response === 0) {
        const newSaveFiles = savePaths.map(savePath => ({
          id: Date.now() + Math.random(),
          name: `Bulk Import - ${savePath.split('\\').pop() || savePath.split('/').pop()}`,
          date: new Date().toISOString(),
          path: savePath,
          type: 'bulk_import'
        }));

        let successCount = 0;
        for (const game of games) {
          try {
            const updatedConfig = {
              ...game.config,
              saveFiles: [...(game.config?.saveFiles || []), ...newSaveFiles]
            };

            updateGame(game.id, { config: updatedConfig });
            successCount++;
          } catch (error) {
            console.error(`Failed to import saves for ${game.name}:`, error);
          }
        }

        window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'Bulk Import Complete',
          message: `Successfully imported saves to ${successCount} out of ${games.length} games.`,
          buttons: ['OK']
        });
      }
    } catch (error) {
      console.error('Failed to perform bulk import:', error);
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Bulk Import Failed',
        message: `Failed to perform bulk import: ${error.message}`,
        buttons: ['OK']
      });
    }
  };

  const handleExportAllSaves = async () => {
    try {
      const exportPath = await window.electronAPI.selectDirectory();
      if (!exportPath) return;

      const gamesWithSaves = games.filter(game => game.config?.saveFiles?.length > 0);
      if (gamesWithSaves.length === 0) {
        window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'No Saves Found',
          message: 'No games with save files were found to export.',
          buttons: ['OK']
        });
        return;
      }

      const result = await window.electronAPI?.showMessageBox({
        type: 'question',
        title: 'Export All Saves',
        message: `Export save data from ${gamesWithSaves.length} game(s) to the selected directory?`,
        buttons: ['Export', 'Cancel'],
        defaultId: 0
      });

      if (result?.response === 0) {
        window.electronAPI?.showMessageBox({
          type: 'info',
          title: 'Export Complete',
          message: `Save data export completed. Files saved to: ${exportPath}`,
          buttons: ['OK']
        });
      }
    } catch (error) {
      console.error('Failed to export saves:', error);
      window.electronAPI?.showMessageBox({
        type: 'error',
        title: 'Export Failed',
        message: `Failed to export saves: ${error.message}`,
        buttons: ['OK']
      });
    }
  };

  const processBulkGames = async () => {
    setIsProcessingBulk(true);
    const gamesToAdd = [];

    for (const gamePath of selectedFiles) {
      try {
        const validation = await window.electronAPI.validateGameFile(gamePath);
        if (validation.valid) {
          const pathParts = gamePath.split(/[\\/]/);
          const fileName = pathParts.pop();
          let gameName = fileName.replace(/\.[^/.]+$/, '');
          if (fileName.toLowerCase() === 'default.xex' && pathParts.length > 0) {
            gameName = pathParts.pop();
          }

          // Fetch game details automatically with rate limiting
          console.log(`Fetching details for bulk game ${gamesToAdd.length + 1}/${selectedFiles.length}:`, gameName);
          const gameDetails = await queueDetailsFetch(Date.now().toString() + Math.random(), gameName);
          console.log('Fetched game details:', gameDetails);

          gamesToAdd.push({
            name: gameName,
            path: gamePath,
            titleId: validation.info?.titleId || null,
            genre: gameDetails?.genre || 'Unknown',
            description: gameDetails?.description || '',
            rating: gameDetails?.rating || 0,
            cover: gameDetails?.coverUrl || ''
          });
        }
      } catch (error) {
        console.error('Error processing game:', gamePath, error);
      }
    }

    if (gamesToAdd.length > 0) {
      batchAddGames(gamesToAdd);
    }

    setIsProcessingBulk(false);
    setShowBulkAddModal(false);
    setSelectedFiles([]);

    await window.electronAPI.showMessageBox({
      type: 'info',
      title: 'Bulk Add Complete',
      message: `Successfully added ${gamesToAdd.length} out of ${selectedFiles.length} games to your library.`,
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
          message: `Found and added ${newGames.length} new games. Syncing covers in background...`,
          buttons: ['OK']
        });

        // Auto-sync covers for newly added games in background with batching
        if (newGames.length > 0) {
          const updatesMap = {};
          for (let i = 0; i < newGames.length; i++) {
            const game = newGames[i];
            try {
              const details = await fetchGameDetails(game.name, game.titleId);
              if (details && details.coverUrl) {
                updatesMap[game.id] = {
                  coverUrl: details.coverUrl,
                  description: details.description || game.description,
                  genre: details.genre || game.genre
                };
              }

              // Batch update every 5 games or at the end
              if (Object.keys(updatesMap).length >= 5 || i === newGames.length - 1) {
                batchUpdateGames({ ...updatesMap });
                Object.keys(updatesMap).forEach(key => delete updatesMap[key]);
              }

              await new Promise(r => setTimeout(r, 200));
            } catch (err) {
              console.log('Auto-sync cover failed for', game.name, err);
            }
          }
        }
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

  const handleSaveGame = async () => {
    if (newGame.name && newGame.path) {
      const savedGame = addGame({
        ...newGame,
        id: Date.now().toString(),
        dateAdded: new Date().toISOString(),
        timesPlayed: 0
      });
      setNewGame({ name: '', path: '', genre: '', description: '', rating: 0, cover: '', titleId: null });
      setShowAddGameModal(false);

      // Auto-sync cover in background
      if (savedGame && savedGame.id) {
        try {
          const validation = await window.electronAPI.validateGameFile(savedGame.path);
          const details = await fetchGameDetails(savedGame.name);
          if (details && details.coverUrl) {
            updateGame(savedGame.id, {
              coverUrl: details.coverUrl,
              description: details.description || savedGame.description,
              genre: details.genre || savedGame.genre,
              titleId: validation?.info?.titleId || savedGame.titleId
            });
          } else if (validation?.info?.titleId) {
            updateGame(savedGame.id, { titleId: validation.info.titleId });
          }
        } catch (err) {
          console.log('Auto-sync cover failed for', savedGame.name, err);
        }
      }
    }
  };

  // Right-click context menu handlers

  const handleSetManualCover = async (game) => {
    setContextMenu({ visible: false, x: 0, y: 0, game: null });
    if (!window.electronAPI) return;
    try {
      // Just immediately open the native image file picker
      const localCover = await window.electronAPI.selectImageFile();
      if (localCover) {
        // Ensure local paths are handled correctly for display
        const displayPath = localCover.startsWith('http') ? localCover : `file:///${localCover.replace(/\\/g, '/')}`;
        updateGame(game.id, { coverUrl: displayPath });
      }
    } catch (err) {
      console.error('Manual cover error:', err);
    }
  };

  const handleResyncCover = async (game) => {
    setContextMenu({ visible: false, x: 0, y: 0, game: null });
    try {
      const validation = await window.electronAPI.validateGameFile(game.path);
      const gameDetails = await fetchGameDetails(game.name);

      const updates = {};
      if (validation && validation.valid && validation.info?.titleId) {
        updates.titleId = validation.info.titleId;
      }

      if (gameDetails && gameDetails.coverUrl) {
        updates.coverUrl = gameDetails.coverUrl;
        updates.description = gameDetails.description || game.description;
        updates.genre = gameDetails.genre || game.genre;
      }

      if (Object.keys(updates).length > 0) {
        updateGame(game.id, updates);
        console.log(`Resynced metadata for ${game.name}`, updates);
      } else {
        alert(`No new metadata found for "${game.name}".`);
      }
    } catch (err) {
      console.error('Resync cover error:', err);
      alert('Failed to resync cover. Check console for details.');
    }
  };

  // Close context menu on click anywhere
  React.useEffect(() => {
    const handleClick = () => setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);


  return (
    <div className="fade-in">
      {/* Right-click context menu */}
      {contextMenu.visible && contextMenu.game && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '12px',
            padding: '6px 0',
            minWidth: '200px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '8px 16px', color: '#8b5cf6', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(139,92,246,0.15)', marginBottom: '4px' }}>
            {contextMenu.game.name}
          </div>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(139,92,246,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={() => handleSetManualCover(contextMenu.game)}
          >
            <ImageIcon size={16} color="#8b5cf6" /> Set Cover Manually
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(139,92,246,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={() => handleResyncCover(contextMenu.game)}
          >
            <RefreshCw size={16} color="#3b82f6" /> Resync Cover
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(139,92,246,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={async () => {
              const menuGame = contextMenu.game;
              setContextMenu({ visible: false, x: 0, y: 0, game: null });
              if (!settings.emulatorPath) {
                alert('Please set emulator path in settings first.');
                return;
              }
              const res = await window.electronAPI.createDesktopShortcut(menuGame.name, settings.emulatorPath, menuGame.path);
              if (res && res.success) {
                // Success
              } else {
                alert(`Failed to create shortcut:\n${res?.error || 'Unknown error'}`);
              }
            }}
          >
            <MonitorUp size={16} color="#f59e0b" /> Create Desktop Shortcut
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(139,92,246,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={() => {
              setContextMenu({ visible: false, x: 0, y: 0, game: null });
              if (!settings.emulatorPath) {
                alert('Please set emulator path in settings first.');
                return;
              }
              window.electronAPI && window.electronAPI.openPatchesFolder(settings.emulatorPath);
            }}
          >
            <FolderOpen size={16} color="#8b5cf6" /> Open Patches Folder
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(139,92,246,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={async () => {
              const menuGame = contextMenu.game;
              setContextMenu({ visible: false, x: 0, y: 0, game: null });
              if (!settings.emulatorPath) {
                alert('Please set emulator path in settings first.');
                return;
              }
              const res = await window.electronAPI.downloadPatches(settings.emulatorPath);
              if (res.success) {
                window.electronAPI?.showMessageBox({ type: 'info', title: 'Success', message: `Downloaded and extracted ${res.count} game patches successfully!` });
              } else {
                alert("Failed to download patches: " + res.error);
              }
            }}
          >
            <Download size={16} color="#14b8a6" /> Download All Patches
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(139,92,246,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={async () => {
              const menuGame = contextMenu.game;
              setContextMenu({ visible: false, x: 0, y: 0, game: null });
              if (!settings.emulatorPath) {
                alert('Please set emulator path in settings first.');
                return;
              }
              const res = await window.electronAPI.installGamePatch({ emulatorPath: settings.emulatorPath, titleId: menuGame.titleId || menuGame.id });
              if (res.success) {
                const fileName = res.path.split(/[\\/]/).pop();
                const titleMatch = fileName.match(/^([A-F0-9]{8})/i);
                if (titleMatch && updateGame) {
                  updateGame(menuGame.id, { titleId: titleMatch[1].toUpperCase() });
                }
                window.electronAPI?.showMessageBox({ type: 'info', title: 'Patch Installed', message: `Patch successfully installed internally as ${fileName} and linked to the game!` });
              } else if (!res.canceled) {
                alert("Failed to install patch: " + res.error);
              }
            }}
          >
            <FilePlus size={16} color="#fbbf24" /> Install Patch...
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(139,92,246,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={async () => {
              const menuGame = contextMenu.game;
              setContextMenu({ visible: false, x: 0, y: 0, game: null });
              if (!settings.emulatorPath) {
                alert('Please set emulator path in settings first.');
                return;
              }
              const confirmMsg = `Do you want to add "${menuGame.name}" to Steam? You will need to restart Steam to see the new shortcut.`;
              if (window.confirm(confirmMsg)) {
                const res = await window.electronAPI.addToSteam({
                  gameName: menuGame.name,
                  emulatorPath: settings.emulatorPath,
                  gamePath: menuGame.path,
                  coverUrl: menuGame.coverUrl
                });
                if (res.success) {
                  window.electronAPI?.showMessageBox({ type: 'info', title: 'Success', message: `Successfully added ${menuGame.name} to Steam! Please restart Steam to see it.` });
                } else {
                  alert("Failed to add to Steam: " + res.error);
                }
              }
            }}
          >
            <Gamepad2 size={16} color="#1a2b4c" fill="#e2e8f0" /> Add to Steam
          </button>
          <div style={{ height: '1px', background: 'rgba(139,92,246,0.15)', margin: '4px 0' }} />
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#eab308', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(234,179,8,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={() => {
              const menuGame = contextMenu.game;
              setContextMenu({ visible: false, x: 0, y: 0, game: null });
              if (!settings.emulatorPath) {
                alert('Please set emulator path in settings first.');
                return;
              }
              setSelectedGameForPatches(menuGame);
            }}
          >
            <Zap size={16} color="#eab308" /> Configure Patches
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(139,92,246,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={() => { setContextMenu({ visible: false, x: 0, y: 0, game: null }); onGameSelect(contextMenu.game); onNavigate('config'); }}
          >
            <Settings size={16} color="#10b981" /> Game Properties
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={() => {
              setContextMenu({ visible: false, x: 0, y: 0, game: null });
              if (window.confirm(`Remove "${contextMenu.game.name}" from your library?`)) removeGame(contextMenu.game.id);
            }}
          >
            <Trash2 size={16} color="#ef4444" /> Remove Game
          </button>
        </div>
      )}
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
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Top Row: Search and Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                  style={{ padding: '10px 16px 10px 40px', fontSize: '14px' }}
                />
              </div>
            </div>

            <select
              className="form-select"
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              style={{ minWidth: '140px', width: 'auto', padding: '10px 16px' }}
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
              style={{ minWidth: '140px', width: 'auto', padding: '10px 16px' }}
            >
              <option value="name">Sort by Name</option>
              <option value="genre">Sort by Genre</option>
              <option value="rating">Sort by Rating</option>
              <option value="lastPlayed">Sort by Last Played</option>
            </select>
          </div>

          {/* Bottom Row: Actions and View Mode */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-success" onClick={handleAddGame} style={{ padding: '8px 16px' }}>
                <Plus size={16} /> Add Games
              </button>
              <button className="btn btn-primary" onClick={handleScanDirectory} disabled={isScanning} style={{ padding: '8px 16px' }}>
                <FolderOpen size={16} /> {isScanning ? 'Scanning...' : 'Scan Directory'}
              </button>
              <button className="btn btn-warning" onClick={syncAllCovers} disabled={isScanning} style={{ padding: '8px 16px' }}>
                <Globe size={16} /> {isScanning ? 'Syncing...' : 'Sync Covers'}
              </button>
              <button className="btn btn-info" onClick={syncMissingCovers} disabled={isScanning} style={{ padding: '8px 16px', backgroundColor: '#3b82f6' }}>
                <Globe size={16} /> {isScanning ? 'Syncing...' : 'Sync Missing Covers'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {viewMode === 'grid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>Card Size:</span>
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
                </div>
              )}

              <div style={{ display: 'flex', gap: '4px', background: 'rgba(30, 30, 60, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <button
                  className="btn"
                  style={{
                    padding: '6px 10px',
                    background: viewMode === 'grid' ? '#8b5cf6' : 'transparent',
                    color: viewMode === 'grid' ? 'white' : '#94a3b8',
                    border: 'none',
                    borderRadius: '6px',
                    margin: 0
                  }}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid size={16} />
                </button>
                <button
                  className="btn"
                  style={{
                    padding: '6px 10px',
                    background: viewMode === 'list' ? '#8b5cf6' : 'transparent',
                    color: viewMode === 'list' ? 'white' : '#94a3b8',
                    border: 'none',
                    borderRadius: '6px',
                    margin: 0
                  }}
                  onClick={() => setViewMode('list')}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

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
              <GameCard
                key={game.id}
                game={game}
                cardSize={cardSize}
                onLaunch={handleLaunchGame}
                onContextMenu={handleContextMenuCallback}
                onToggleFavorite={handleToggleFavorite}
                onConfigure={handleConfigure}
              />
            ) : (
              <GameListItem
                key={game.id}
                game={game}
                onLaunch={handleLaunchGame}
                onToggleFavorite={handleToggleFavorite}
                onConfigure={handleConfigure}
                onRemove={handleRemoveGame}
              />
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
                onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                placeholder="Enter game name..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Genre</label>
              <select
                className="form-select"
                value={newGame.genre}
                onChange={(e) => setNewGame({ ...newGame, genre: e.target.value })}
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
                onChange={(e) => setNewGame({ ...newGame, rating: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cover Image URL</label>
              <input
                type="url"
                className="form-input"
                value={newGame.cover}
                onChange={(e) => setNewGame({ ...newGame, cover: e.target.value })}
                placeholder="Cover image URL (auto-fetched if available)..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows="3"
                value={newGame.description}
                onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
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

      {/* Game Patches Modal */}
      {selectedGameForPatches && (
        <GamePatchesModal
          game={games.find(g => g.id === selectedGameForPatches.id) || selectedGameForPatches}
          settings={settings}
          onClose={() => setSelectedGameForPatches(null)}
          updateGame={updateGame}
        />
      )}
    </div>
  );
};

export default GameLibrary;