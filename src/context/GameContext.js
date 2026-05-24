import React, { createContext, useState, useEffect, useRef } from 'react';
import { sanitizeStoredCoverUrl, coverUrlForPersistence, isEphemeralCoverUrl } from '../services/coverService';
import { loadPersisted, savePersisted } from '../utils/persistentStorage';

export const GameContext = createContext();

const sanitizeGameCovers = async (gameList) => {
  const out = [];
  for (const game of gameList) {
    let coverUrl = game.coverHttpUrl || game.coverUrl;
    if (coverUrl && isEphemeralCoverUrl(coverUrl)) {
      const exists = window.electronAPI?.coverCacheExists
        ? await window.electronAPI.coverCacheExists(coverUrl)
        : false;
      if (!exists) {
        coverUrl = game.coverHttpUrl || null;
      } else {
        coverUrl = sanitizeStoredCoverUrl(coverUrl);
      }
    } else if (coverUrl) {
      coverUrl = sanitizeStoredCoverUrl(coverUrl);
    }
    if (coverUrl !== game.coverUrl) {
      out.push({ ...game, coverUrl: coverUrl || undefined });
    } else {
      out.push(game);
    }
  }
  return out;
};

const gamesForPersistence = (gameList) =>
  gameList.map((game) => {
    const persistedCover =
      game.coverHttpUrl || coverUrlForPersistence(game.coverUrl) || null;
    if (persistedCover === game.coverUrl && !game.coverHttpUrl) return game;
    const next = { ...game };
    if (persistedCover) {
      next.coverUrl = persistedCover;
      if (game.coverHttpUrl) next.coverHttpUrl = game.coverHttpUrl;
    } else {
      delete next.coverUrl;
      delete next.coverHttpUrl;
    }
    return next;
  });

export const GameProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [xbox360DB, setXbox360DB] = useState([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [gamesHydrated, setGamesHydrated] = useState(false);
  const canPersistGames = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const saved = await loadPersisted('games', []);
      if (cancelled) return;
      const parsedGames = await sanitizeGameCovers(Array.isArray(saved) ? saved : []);
      setGames(parsedGames);
      setRecentGames(
        parsedGames
          .filter((game) => game.lastPlayed)
          .sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed))
          .slice(0, 5)
      );
      if (parsedGames.length > 0) {
        canPersistGames.current = true;
      }
      setGamesHydrated(true);
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load Xbox 360 Database from shared GitHub resource
  useEffect(() => {
    const loadXbox360DB = async () => {
      try {
        console.log('Fetching shared Xbox 360 Database...');
        const response = await fetch('https://xenia-manager.github.io/x360db/games.json');
        if (response.ok) {
          const data = await response.json();
          setXbox360DB(data);
          setIsDbLoaded(true);
          console.log(`Xbox 360 DB loaded: ${data.length} games`);
        } else {
          console.warn('Failed to fetch Xbox 360 DB:', response.status);
        }
      } catch (err) {
        console.warn('Xbox 360 DB fetch error:', err);
      }
    };
    loadXbox360DB();
  }, []);

  useEffect(() => {
    if (!gamesHydrated || !canPersistGames.current) return;
    savePersisted('games', gamesForPersistence(games));
    const recent = games
      .filter((game) => game.lastPlayed)
      .sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed))
      .slice(0, 5);
    setRecentGames(recent);
  }, [games, gamesHydrated]);

  const markGamesDirty = () => {
    canPersistGames.current = true;
  };

  const addGame = (gameData) => {
    markGamesDirty();
    const newGame = {
      id: Date.now().toString(),
      ...gameData,
      dateAdded: new Date().toISOString(),
      lastPlayed: null,
      timesPlayed: 0
    };

    const updatedGames = [...games, newGame];
    setGames(updatedGames);
    return newGame;
  };

  const batchAddGames = (gamesData) => {
    markGamesDirty();
    const newGames = gamesData.map(gameData => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...gameData,
      dateAdded: new Date().toISOString(),
      lastPlayed: null,
      timesPlayed: 0
    }));

    setGames(prevGames => [...prevGames, ...newGames]);
    return newGames;
  };

  const scanGamesDirectory = async (directoryPath) => {
    try {
      const files = await window.electronAPI.scanDirectory(directoryPath);
      const gameExtensions = ['.iso', '.cue', '.img', '.mdf', '.nrg', '.ccd', '.xex', '.xcp'];

      const gameFiles = files.filter(file =>
        gameExtensions.some(ext => file.toLowerCase().endsWith(ext))
      );

      const newGames = [];
      for (const gameFile of gameFiles) {
        // Check if game already exists
        const existingGame = games.find(game => game.path === gameFile);
        if (!existingGame) {
          const pathParts = gameFile.split(/[\\/]/);
          const fileName = pathParts.pop();
          let gameName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
          if (fileName.toLowerCase() === 'default.xex' && pathParts.length > 0) {
            gameName = pathParts.pop();
          }

          const validation = await window.electronAPI.validateGameFile(gameFile);

          const newGame = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: gameName,
            path: gameFile,
            titleId: validation?.info?.titleId || null,
            isArcade: Boolean(validation?.info?.isArcade),
            genre: 'Unknown',
            description: 'Auto-detected game',
            dateAdded: new Date().toISOString(),
            lastPlayed: null,
            timesPlayed: 0
          };

          newGames.push(newGame);
        }
      }

      if (newGames.length > 0) {
        markGamesDirty();
        const updatedGames = [...games, ...newGames];
        setGames(updatedGames);
      }

      return newGames;
    } catch (error) {
      console.error('Error scanning games directory:', error);
      throw error;
    }
  };

  const removeGame = (gameId) => {
    markGamesDirty();
    setGames(prevGames => prevGames.filter(game => game.id !== gameId));
  };

  const updateGame = (gameId, updates) => {
    markGamesDirty();
    setGames(prevGames =>
      prevGames.map(game =>
        game.id === gameId
          ? { ...game, ...updates }
          : game
      )
    );
  };

  const batchUpdateGames = (updatesMap) => {
    markGamesDirty();
    setGames(prevGames =>
      prevGames.map(game =>
        updatesMap[game.id]
          ? { ...game, ...updatesMap[game.id] }
          : game
      )
    );
  };

  const getGameById = (gameId) => {
    return games.find(game => game.id === gameId);
  };

  const getGamesByGenre = (genre) => {
    return games.filter(game => game.genre === genre);
  };

  const searchGames = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    return games.filter(game =>
      game.name.toLowerCase().includes(term) ||
      (game.genre && game.genre.toLowerCase().includes(term)) ||
      (game.description && game.description.toLowerCase().includes(term))
    );
  };

  const getGameStats = () => {
    const totalGames = games.length;
    const totalPlayTime = games.reduce((total, game) => total + (game.timesPlayed || 0), 0);
    const favoriteGames = games.filter(game => game.rating >= 4);
    const genreDistribution = games.reduce((acc, game) => {
      const genre = game.genre || 'Unknown';
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {});

    return {
      totalGames,
      totalPlayTime,
      favoriteGames: favoriteGames.length,
      genreDistribution,
      mostPlayedGame: games.reduce((prev, current) =>
        (prev.timesPlayed || 0) > (current.timesPlayed || 0) ? prev : current,
        games[0] || null
      )
    };
  };

  const importGames = (gameList) => {
    markGamesDirty();
    const validGames = gameList.filter(game =>
      game.name && game.path && !games.some(existing => existing.path === game.path)
    );

    const gamesWithIds = validGames.map(game => ({
      ...game,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      dateAdded: new Date().toISOString(),
      timesPlayed: 0
    }));

    setGames(prevGames => [...prevGames, ...gamesWithIds]);
    return gamesWithIds.length;
  };

  const exportGames = () => {
    return games.map(game => ({
      name: game.name,
      path: game.path,
      genre: game.genre,
      description: game.description,
      rating: game.rating,
      config: game.config
    }));
  };

  const clearAllGames = () => {
    markGamesDirty();
    setGames([]);
    setRecentGames([]);
  };

  const toggleFavorite = (gameId) => {
    updateGame(gameId, {
      isFavorite: !games.find(game => game.id === gameId)?.isFavorite
    });
  };

  const getFavoriteGames = () => {
    return games.filter(game => game.isFavorite);
  };

  const value = {
    games,
    recentGames,
    addGame,
    batchAddGames,
    removeGame,
    updateGame,
    getGameById,
    getGamesByGenre,
    searchGames,
    getGameStats,
    importGames,
    exportGames,
    clearAllGames,
    scanGamesDirectory,
    toggleFavorite,
    getFavoriteGames,
    batchUpdateGames,
    xbox360DB,
    isDbLoaded,
    gamesHydrated
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};