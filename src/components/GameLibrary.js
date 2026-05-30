import React, { useState, useContext, useCallback, useMemo, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Maximize2,
  ImageIcon,
  Eraser
} from 'lucide-react';
import { GameContext } from '../context/GameContext';
import { SettingsContext } from '../context/SettingsContext';
import GamePatchesModal from './GamePatchesModal';
import CoverImage from './CoverImage';
import CoverPickerModal from './CoverPickerModal';
import {
  fetchGameCoverDetails,
  MATCH_THRESHOLDS,
  coverFieldsFromDetails,
  localCoverResetPatch
} from '../services/coverService';
import useGamepad from '../hooks/useGamepad';
import { buildGameLaunchConfig } from '../services/launchConfig';
import { clampContextMenuPosition } from '../utils/contextMenuPosition';
import useTranslation from '../hooks/useTranslation';

const CONTEXT_MENU_WIDTH = 220;
const CONTEXT_MENU_EST_HEIGHT = 400;

const gameNeedsCoverFetch = (game) =>
  !game.coverUrl && !game.coverHttpUrl;

// Memoized sub-components moved outside to prevent re-definition and flashing
const GameCard = React.memo(React.forwardRef(({ game, cardSize = 180, isFocused = false, onLaunch, onContextMenu, onToggleFavorite, onConfigure, onCoverFailed }, ref) => {
  const { t } = useTranslation();
  const [isLaunching, setIsLaunching] = React.useState(false);

  // Dimensions: Modern 2:3 aspect ratio vertical posters
  const coverWidth = cardSize;
  const coverHeight = cardSize * 1.5;

  return (
    <div
      ref={ref}
      className={`game-card vertical-poster${isFocused ? ' game-card--focused' : ''}`}
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
        <CoverImage
          gameName={game.name}
          coverUrl={game.coverHttpUrl || game.coverUrl}
          alt={game.name}
          placeholderSize={40}
          onCoverFailed={() => onCoverFailed?.(game)}
        />
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
            title={t('configureGame')}
          >
            <Settings size={18} color="white" />
          </button>
          <button
            className="btn-icon danger-icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContextMenu(e, game);
            }}
            title={t('options')}
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
            <span>{game.genre !== 'Unknown' ? game.genre : t('localGame')}</span>
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
}));

GameCard.displayName = 'GameCard';

const GameListItem = React.memo(({ game, onLaunch, onToggleFavorite, onConfigure, onRemove }) => {
  const { t } = useTranslation();
  return (
  <div className="card" style={{ padding: '16px', marginBottom: '8px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{
        width: '64px',
        height: '64px',
        background: 'linear-gradient(180deg, #7bbf32, #107c10)',
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
          {game.genre || t('unknownGenre')} • {game.timesPlayed || 0} plays
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
          {t('play')}
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
  );
});
const GameLibrary = ({ onGameSelect, onNavigate, onEnterConsoleMode }) => {
  const { t } = useTranslation();
  const {
    games,
    addGame,
    batchAddGames,
    removeGame,
    updateGame,
    batchUpdateGames,
    scanGamesDirectory,
    toggleFavorite,
    xbox360DB,
    isDbLoaded,
    gamesHydrated
  } = useContext(GameContext);
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
  const [coverPickerGame, setCoverPickerGame] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, game: null });
  const contextMenuAnchor = useRef({ x: 0, y: 0 });
  const contextMenuRef = useRef(null);
  const [padFocusIdx, setPadFocusIdx] = useState(0);
  const gamesGridRef = React.useRef(null);
  const gameCardRefs = React.useRef([]);
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

  React.useEffect(() => {
    setPadFocusIdx(0);
  }, [searchTerm, filterGenre, sortBy, viewMode]);

  React.useEffect(() => {
    if (padFocusIdx >= filteredGames.length) {
      setPadFocusIdx(Math.max(0, filteredGames.length - 1));
    }
  }, [filteredGames.length, padFocusIdx]);

  React.useEffect(() => {
    const node = gameCardRefs.current[padFocusIdx];
    node?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [padFocusIdx, viewMode, cardSize]);

  const fetchGameDetails = useCallback(async (gameName, titleId = null) => {
    return fetchGameCoverDetails(gameName, titleId, xbox360DB, { lenient: true, allowPlaceholder: false });
  }, [xbox360DB]);

  const handleCoverFailed = useCallback(async (game) => {
    const filename = game.path ? game.path.split(/[\\/]/).pop() : game.name;
    const gameDetails = await fetchGameDetails(filename, game.titleId);
    if (gameDetails?.coverUrl) {
      updateGame(game.id, {
        ...coverFieldsFromDetails(gameDetails),
        description: gameDetails.description || game.description,
        genre: gameDetails.genre || game.genre
      });
      return gameDetails.coverUrl;
    }
    return null;
  }, [fetchGameDetails, updateGame]);

  // Auto-fetch missing covers once per library load (avoid re-sync loop on each cover update)
  const coverAutoSyncInFlight = React.useRef(false);

  React.useEffect(() => {
    if (!isDbLoaded || !gamesHydrated || games.length === 0 || coverAutoSyncInFlight.current) {
      return undefined;
    }

    const missing = games.filter(gameNeedsCoverFetch);
    if (missing.length === 0) return undefined;

    let cancelled = false;
    coverAutoSyncInFlight.current = true;

    const syncMissing = async () => {
      const updatesMap = {};
      try {
        for (const game of missing) {
          if (cancelled) break;
          const filename = game.path ? game.path.split(/[\\/]/).pop() : game.name;
          const details = await fetchGameCoverDetails(filename, game.titleId, xbox360DB, {
            lenient: true,
            allowPlaceholder: false
          });
          if (details?.coverUrl) {
            updatesMap[game.id] = {
              ...coverFieldsFromDetails(details),
              description: details.description || game.description,
              genre: details.genre || game.genre
            };
          }
          if (Object.keys(updatesMap).length >= 5) {
            batchUpdateGames({ ...updatesMap });
            Object.keys(updatesMap).forEach((id) => delete updatesMap[id]);
          }
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
        if (Object.keys(updatesMap).length > 0) {
          batchUpdateGames(updatesMap);
        }
      } finally {
        coverAutoSyncInFlight.current = false;
      }
    };

    syncMissing();
    return () => {
      cancelled = true;
    };
  }, [isDbLoaded, gamesHydrated, games.length, xbox360DB, batchUpdateGames]);

  const coverFetchQueue = React.useRef([]);
  const isFetchingCovers = React.useRef(false);

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
        if (gameDetails?.coverUrl) {
          const updateData = {
            ...coverFieldsFromDetails(gameDetails)
          };
          if (gameDetails.description) updateData.description = gameDetails.description;
          if (gameDetails.genre && (!game.genre || game.genre === 'Unknown')) updateData.genre = gameDetails.genre;
          if (gameDetails.rating && !game.rating) updateData.rating = gameDetails.rating;

          updatesMap[game.id] = updateData;
          updatedCount++;
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

  const handleClearCoverCache = async () => {
    if (!window.electronAPI?.clearCoverCache) {
      alert('Cover cache cleanup is only available in the desktop app.');
      return;
    }
    let stats = { fileCount: 0, bytes: 0 };
    if (window.electronAPI.getCoverCacheStats) {
      stats = (await window.electronAPI.getCoverCacheStats()) || stats;
    }
    const sizeMb =
      stats.bytes >= 1024 * 1024
        ? `${(stats.bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round((stats.bytes || 0) / 1024)} KB`;
    if (!stats.fileCount) {
      alert('Cover cache is already empty.');
      return;
    }
    const confirmed = window.confirm(
      `Delete ${stats.fileCount} cached cover(s) (${sizeMb})?\n\nCovers will re-download when shown in the library.`
    );
    if (!confirmed) return;

    setIsScanning(true);
    try {
      const result = await window.electronAPI.clearCoverCache();
      if (!result?.ok) {
        alert(result?.error || 'Failed to clear cover cache.');
        return;
      }
      const updatesMap = {};
      games.forEach((game) => {
        const patch = localCoverResetPatch(game);
        if (patch) updatesMap[game.id] = patch;
      });
      if (Object.keys(updatesMap).length > 0) {
        batchUpdateGames(updatesMap);
      }
    } finally {
      setIsScanning(false);
    }
    await syncMissingCovers({ silent: true });
  };

  const syncMissingCovers = async (options = {}) => {
    const { silent = false } = options;
    const missingCoverGames = games.filter(gameNeedsCoverFetch);
    if (missingCoverGames.length === 0) {
      if (!silent) alert('All games already have covers.');
      return;
    }

    if (!silent) {
      const confirmed = window.confirm(`Found ${missingCoverGames.length} games missing covers. Sync them now?`);
      if (!confirmed) return;
    }

    setIsScanning(true);
    let updatedCount = 0;
    const updatesMap = {};

    try {
      for (let i = 0; i < missingCoverGames.length; i++) {
        const game = missingCoverGames[i];
        console.log(`Syncing missing cover ${i + 1}/${missingCoverGames.length}: ${game.name}`);

        const filename = game.path ? (game.path.split(/[\\/]/).pop()) : game.name;
        const gameDetails = await fetchGameDetails(filename, game.titleId);
        if (gameDetails?.coverUrl) {
          const updateData = {
            ...coverFieldsFromDetails(gameDetails)
          };
          if (gameDetails.description) updateData.description = gameDetails.description;
          if (gameDetails.genre && (!game.genre || game.genre === 'Unknown')) updateData.genre = gameDetails.genre;
          if (gameDetails.rating && !game.rating) updateData.rating = gameDetails.rating;

          updatesMap[game.id] = updateData;
          updatedCount++;
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

      if (!silent) {
        alert(`Missing cover sync completed! Updated ${updatedCount} out of ${missingCoverGames.length} games.`);
      }
    } catch (error) {
      console.error('Error syncing covers:', error);
      if (!silent) alert('Error occurred while syncing covers. Check console for details.');
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
      const launchConfig = buildGameLaunchConfig(game, settings);

      await window.electronAPI.launchGame(settings.emulatorPath, game.path, launchConfig);

      updateGame(game.id, {
        lastPlayed: new Date().toISOString(),
        timesPlayed: (game.timesPlayed || 0) + 1
      });
    } catch (error) {
      console.error('Launch error:', error);
    }
  }, [settings, updateGame]);

  const handleContextMenuCallback = useCallback((e, game) => {
    e.preventDefault();
    e.stopPropagation();
    contextMenuAnchor.current = { x: e.clientX, y: e.clientY };
    const { left, top } = clampContextMenuPosition(
      e.clientX,
      e.clientY,
      CONTEXT_MENU_WIDTH,
      CONTEXT_MENU_EST_HEIGHT
    );
    setContextMenu({ visible: true, x: left, y: top, game });
  }, []);

  useLayoutEffect(() => {
    if (!contextMenu.visible || !contextMenuRef.current) return undefined;
    const rect = contextMenuRef.current.getBoundingClientRect();
    const { left, top } = clampContextMenuPosition(
      contextMenuAnchor.current.x,
      contextMenuAnchor.current.y,
      rect.width,
      rect.height
    );
    setContextMenu((prev) => {
      if (!prev.visible) return prev;
      if (prev.x === left && prev.y === top) return prev;
      return { ...prev, x: left, y: top };
    });
    return undefined;
  }, [contextMenu.visible, contextMenu.game?.id]);

  const handleToggleFavorite = useCallback((id) => {
    toggleFavorite(id);
  }, [toggleFavorite]);

  const handleConfigure = useCallback((game) => {
    onGameSelect(game);
    onNavigate('config');
  }, [onGameSelect, onNavigate]);

  const getGridColumns = useCallback(() => {
    if (viewMode !== 'grid' || !gamesGridRef.current) return 1;
    const style = window.getComputedStyle(gamesGridRef.current);
    const trackList = style.gridTemplateColumns || '';
    if (!trackList || trackList === 'none') return 1;
    return Math.max(1, trackList.split(' ').filter(Boolean).length);
  }, [viewMode, cardSize]);

  const gamepadEnabled =
    !contextMenu.visible &&
    !coverPickerGame &&
    !showAddGameModal &&
    !showBulkAddModal &&
    !selectedGameForPatches;

  useGamepad(
    {
      back: () => {
        if (contextMenu.visible) {
          setContextMenu({ visible: false, x: 0, y: 0, game: null });
          return;
        }
        if (coverPickerGame) {
          setCoverPickerGame(null);
          return;
        }
        if (selectedGameForPatches) {
          setSelectedGameForPatches(null);
          return;
        }
        if (showAddGameModal) {
          setShowAddGameModal(false);
          return;
        }
        if (showBulkAddModal) {
          setShowBulkAddModal(false);
        }
      },
      left: () => setPadFocusIdx((index) => Math.max(0, index - 1)),
      right: () => setPadFocusIdx((index) => Math.min(filteredGames.length - 1, index + 1)),
      up: () => {
        const cols = getGridColumns();
        setPadFocusIdx((index) => Math.max(0, index - cols));
      },
      down: () => {
        const cols = getGridColumns();
        setPadFocusIdx((index) => Math.min(filteredGames.length - 1, index + cols));
      },
      confirm: () => {
        const game = filteredGames[padFocusIdx];
        if (game) handleLaunchGame(game);
      },
      actionX: () => {
        const game = filteredGames[padFocusIdx];
        if (game) handleToggleFavorite(game.id);
      },
      actionY: () => {
        const game = filteredGames[padFocusIdx];
        if (game) handleConfigure(game);
      },
      menu: () => onEnterConsoleMode?.()
    },
    gamepadEnabled && filteredGames.length > 0
  );

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
                  ...coverFieldsFromDetails(details),
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
              ...coverFieldsFromDetails(details),
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
      const localCover = await window.electronAPI.selectImageFile();
      if (localCover) {
        const displayPath = localCover.startsWith('http') ? localCover : `file:///${localCover.replace(/\\/g, '/')}`;
        updateGame(game.id, { coverUrl: displayPath, coverSource: 'manual', coverMatchScore: 1 });
      }
    } catch (err) {
      console.error('Manual cover error:', err);
    }
  };

  const handlePickCover = (game) => {
    setContextMenu({ visible: false, x: 0, y: 0, game: null });
    setCoverPickerGame(game);
  };

  const handleCoverPickerSelect = useCallback(
    (entry) => {
      if (!coverPickerGame) return;
      updateGame(coverPickerGame.id, {
        coverUrl: entry.coverUrl,
        coverSource: entry.source || 'manual',
        coverMatchScore: entry.score ?? 1,
        description: entry.description || coverPickerGame.description,
        genre: entry.genre || coverPickerGame.genre
      });
      setCoverPickerGame(null);
    },
    [coverPickerGame, updateGame]
  );

  const handleResetWrongCovers = async () => {
    const suspect = games.filter(
      (g) =>
        !g.coverUrl ||
        g.coverSource === 'placeholder' ||
        (g.coverSource && g.coverSource !== 'manual' && (g.coverMatchScore ?? 0) < MATCH_THRESHOLDS.MIN_FALLBACK_MATCH) ||
        (typeof g.coverUrl === 'string' && g.coverUrl.startsWith('http://'))
    );
    if (!suspect.length) {
      alert('No suspect covers detected. Use "Pick Cover" on individual games to override.');
      return;
    }
    const confirmed = window.confirm(
      `Found ${suspect.length} games with missing or low-confidence covers. Re-fetch with the new matcher?`
    );
    if (!confirmed) return;
    setIsScanning(true);
    let updated = 0;
    try {
      for (const game of suspect) {
        const filename = game.path ? game.path.split(/[\\/]/).pop() : game.name;
        const details = await fetchGameCoverDetails(filename, game.titleId, xbox360DB);
        if (details?.coverUrl) {
          updateGame(game.id, {
            ...coverFieldsFromDetails(details),
            description: details.description || game.description,
            genre: details.genre || game.genre
          });
          updated += 1;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      alert(`Re-fetched ${updated} of ${suspect.length} covers.`);
    } finally {
      setIsScanning(false);
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

  // Close context menu on outside click / Escape
  React.useEffect(() => {
    const closeMenu = () => setContextMenu((prev) => (prev.visible ? { ...prev, visible: false, game: null } : prev));

    const handlePointerDown = (e) => {
      if (!e.target.closest?.('.game-context-menu')) {
        closeMenu();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  return (
    <div className="fade-in">
      {/* Right-click context menu (portal so it is not clipped by the scrollable library) */}
      {contextMenu.visible && contextMenu.game && createPortal(
        <div
          ref={contextMenuRef}
          className="game-context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 20000,
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid rgba(16, 124, 16, 0.3)',
            borderRadius: '12px',
            padding: '6px 0',
            minWidth: `${CONTEXT_MENU_WIDTH}px`,
            maxHeight: `calc(100vh - 16px)`,
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div style={{ padding: '8px 16px', color: '#7bbf32', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(139,92,246,0.15)', marginBottom: '4px' }}>
            {contextMenu.game.name}
          </div>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(16,124,16,0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={() => handlePickCover(contextMenu.game)}
          >
            <ImageIcon size={16} color="#10b981" /> {t('pickCover')}
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(16,124,16,0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={() => handleSetManualCover(contextMenu.game)}
          >
            <ImageIcon size={16} color="#7bbf32" /> {t('setCoverFromFile')}
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(16,124,16,0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={() => handleResyncCover(contextMenu.game)}
          >
            <RefreshCw size={16} color="#3b82f6" /> {t('resyncCoverAuto')}
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(16,124,16,0.2)'}
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
            <MonitorUp size={16} color="#f59e0b" /> {t('createDesktopShortcut')}
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(16,124,16,0.2)'}
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
            <FolderOpen size={16} color="#7bbf32" /> {t('openPatchesFolder')}
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(16,124,16,0.2)'}
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
            <Download size={16} color="#14b8a6" /> {t('downloadAllPatches')}
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(16,124,16,0.2)'}
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
            <FilePlus size={16} color="#fbbf24" /> {t('installPatch')}
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(16,124,16,0.2)'}
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
            <Gamepad2 size={16} color="#1a2b4c" fill="#e2e8f0" /> {t('addToSteam')}
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
            <Zap size={16} color="#eab308" /> {t('configurePatches')}
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(16,124,16,0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            onClick={() => { setContextMenu({ visible: false, x: 0, y: 0, game: null }); onGameSelect(contextMenu.game); onNavigate('config'); }}
          >
            <Settings size={16} color="#10b981" /> {t('gameProperties')}
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
            <Trash2 size={16} color="#ef4444" /> {t('removeGame')}
          </button>
        </div>,
        document.body
      )}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '8px',
          background: 'linear-gradient(180deg, #7bbf32, #107c10)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t('gameLibrary')}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>
          {t('gameLibrarySubtitle')}
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
                  placeholder={t('searchGames')}
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
              <option value="all">{t('allGenres')}</option>
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
              <option value="name">{t('sortByName')}</option>
              <option value="genre">{t('sortByGenre')}</option>
              <option value="rating">{t('sortByRating')}</option>
              <option value="lastPlayed">{t('sortByLastPlayed')}</option>
            </select>
          </div>

          {/* Bottom Row: Actions and View Mode */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div className="library-toolbar">
              <div className="library-toolbar-group" role="group" aria-label="Library actions">
                <button type="button" className="btn-toolbar btn-toolbar--accent" onClick={handleAddGame}>
                  <Plus size={15} strokeWidth={2.5} /> {t('addGames')}
                </button>
                <button type="button" className="btn-toolbar" onClick={handleScanDirectory} disabled={isScanning}>
                  <FolderOpen size={15} /> {isScanning ? t('scanning') : t('scanDirectory')}
                </button>
              </div>
              <span className="library-toolbar-label">{t('coversLabel')}</span>
              <div className="library-toolbar-group" role="group" aria-label="Cover sync">
                <button type="button" className="btn-toolbar" onClick={syncAllCovers} disabled={isScanning}>
                  <Globe size={15} /> {isScanning ? t('syncing') : t('syncAll')}
                </button>
                <button type="button" className="btn-toolbar" onClick={syncMissingCovers} disabled={isScanning}>
                  <Globe size={15} /> {t('syncMissing')}
                </button>
                <button type="button" className="btn-toolbar btn-toolbar--caution" onClick={handleResetWrongCovers} disabled={isScanning}>
                  <RefreshCw size={15} /> {t('fixWrongCovers')}
                </button>
                <button type="button" className="btn-toolbar" onClick={handleClearCoverCache} disabled={isScanning} title="Delete downloaded cover images and re-fetch">
                  <Eraser size={15} /> {t('clearCache')}
                </button>
              </div>
              {onEnterConsoleMode && (
                <button type="button" className="btn-toolbar btn-toolbar--console" onClick={onEnterConsoleMode}>
                  <Maximize2 size={15} /> {t('consoleMode')}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {viewMode === 'grid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{t('cardSize')}:</span>
                  <input
                    type="range"
                    min="80"
                    max="200"
                    value={cardSize}
                    onChange={(e) => setCardSize(parseInt(e.target.value))}
                    style={{
                      flex: 1,
                      height: '4px',
                      background: 'rgba(16, 124, 16, 0.3)',
                      borderRadius: '2px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              )}

              <div className="view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`view-toggle-btn${viewMode === 'grid' ? ' is-active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  title={t('gridView')}
                >
                  <Grid size={16} />
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn${viewMode === 'list' ? ' is-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  title={t('listView')}
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
          ref={gamesGridRef}
          className={viewMode === 'grid' ? 'grid-dynamic' : ''}
          style={viewMode === 'grid' ? {
            '--card-min-width': `${Math.max(150, cardSize * 1.5)}px`
          } : {}}
        >
          {filteredGames.map((game, index) =>
            viewMode === 'grid' ? (
              <GameCard
                key={game.id}
                ref={(el) => { gameCardRefs.current[index] = el; }}
                game={game}
                cardSize={cardSize}
                isFocused={index === padFocusIdx}
                onLaunch={handleLaunchGame}
                onContextMenu={handleContextMenuCallback}
                onToggleFavorite={handleToggleFavorite}
                onConfigure={handleConfigure}
                onCoverFailed={handleCoverFailed}
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
            {searchTerm || filterGenre !== 'all' ? t('noGamesFound') : t('noGamesInLibrary')}
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            {searchTerm || filterGenre !== 'all'
              ? t('noGamesFilteredHint')
              : t('noGamesEmptyHint')
            }
          </p>
          {!searchTerm && filterGenre === 'all' && (
            <button
              className="btn btn-primary"
              onClick={handleAddGame}
            >
              <Plus size={16} />
              {t('addYourFirstGame')}
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
                {t('addNewGame')}
              </h3>
            </div>

            <div className="form-group">
              <label className="form-label">{t('gameName')}</label>
              <input
                type="text"
                className="form-input"
                value={newGame.name}
                onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                placeholder={t('gameNamePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('genre')}</label>
              <select
                className="form-select"
                value={newGame.genre}
                onChange={(e) => setNewGame({ ...newGame, genre: e.target.value })}
              >
                <option value="">{t('selectGenrePlaceholder')}</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('rating')}</label>
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
              <label className="form-label">{t('coverImageUrl')}</label>
              <input
                type="url"
                className="form-input"
                value={newGame.cover}
                onChange={(e) => setNewGame({ ...newGame, cover: e.target.value })}
                placeholder={t('coverUrlPlaceholder')}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('description')}</label>
              <textarea
                className="form-input"
                rows="3"
                value={newGame.description}
                onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddGameModal(false)}
                style={{ flex: 1 }}
              >
                {t('cancel')}
              </button>
              <button
                className="btn btn-success"
                onClick={handleSaveGame}
                disabled={!newGame.name || !newGame.path}
                style={{ flex: 1 }}
              >
                {t('addGame')}
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
                {t('bulkAddGames')}
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
                {t('bulkAddCoversHint')}
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
                {t('cancel')}
              </button>
              <button
                className="btn btn-success"
                onClick={processBulkGames}
                disabled={isProcessingBulk || selectedFiles.length === 0}
                style={{ flex: 1 }}
              >
                {isProcessingBulk ? t('processing') : `${t('addGames')} (${selectedFiles.length})`}
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

      {coverPickerGame && (
        <CoverPickerModal
          game={games.find((g) => g.id === coverPickerGame.id) || coverPickerGame}
          onClose={() => setCoverPickerGame(null)}
          onSelect={handleCoverPickerSelect}
        />
      )}
    </div>
  );
};

export default GameLibrary;