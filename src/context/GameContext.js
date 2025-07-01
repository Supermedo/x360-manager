import React, { createContext, useState, useEffect } from 'react';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);

  // Load games from localStorage on component mount
  useEffect(() => {
    const savedGames = localStorage.getItem('x360-games');
    if (savedGames) {
      try {
        const parsedGames = JSON.parse(savedGames);
        setGames(parsedGames);
        
        // Update recent games (last 5 played)
        const recent = parsedGames
          .filter(game => game.lastPlayed)
          .sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed))
          .slice(0, 5);
        setRecentGames(recent);
      } catch (error) {
        console.error('Error loading games from localStorage:', error);
      }
    }
  }, []);

  // Save games to localStorage whenever games array changes
  useEffect(() => {
    localStorage.setItem('x360-games', JSON.stringify(games));
    
    // Update recent games
    const recent = games
      .filter(game => game.lastPlayed)
      .sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed))
      .slice(0, 5);
    setRecentGames(recent);
  }, [games]);

  const addGame = (gameData) => {
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
          const fileName = gameFile.split('\\').pop().split('/').pop();
          const gameName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
          
          const newGame = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: gameName,
            path: gameFile,
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
    setGames(prevGames => prevGames.filter(game => game.id !== gameId));
  };

  const updateGame = (gameId, updates) => {
    setGames(prevGames => 
      prevGames.map(game => 
        game.id === gameId 
          ? { ...game, ...updates }
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
    getFavoriteGames
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};