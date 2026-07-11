import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameContext } from '../../context/GameContext';
import { SettingsContext } from '../../context/SettingsContext';
import CoverImage from '../CoverImage';
import useGamepad, {
  wasRecentGamepadInput,
  resetGamepadHoldState,
  getActiveGamepadLayout,
  markKeyboardInput,
  isLikelyGamepadEchoKey
} from '../../hooks/useGamepad';
import MetroSettingsPanel from './MetroSettingsPanel';
import MetroProfilePanel from './MetroProfilePanel';
import MetroSearchView from './MetroSearchView';
import { fetchGameCoverDetails } from '../../services/coverService';
import {
  METRO_CHANNELS,
  GAMES_HUB_TILES,
  GAMES_HUB_NAV,
  HOME_HUB_NAV,
  SETTINGS_BLADE_TILES,
  SETTINGS_GRID_NAV,
  DEFAULT_AVATAR,
  METRO_SOUNDS,
  HUB_BASE,
  SETTINGS_GRID_BASE
} from './metroConstants';
import './MetroDashboard.css';

const playSound = (url) => {
  if (!url) return;
  try {
    const audio = new Audio(url);
    audio.volume = 0.35;
    audio.play().catch(() => {});
  } catch { /* ignore */ }
};

const gameToTile = (game) => ({
  id: game.id,
  label: game.name,
  game,
  type: 'game',
  isUserGame: true,
  coverUrl: game.coverHttpUrl || game.coverUrl
});

const isTextInputActive = () => {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
};

const NAV_KEY_MAP = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down'
};

const WASD_KEY_MAP = {
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down'
};

const MetroDashboard = ({ onExit, onLaunch, onConfigure, onSwitchProfile }) => {
  const { games, recentGames, updateGame, xbox360DB, toggleFavorite } = React.useContext(GameContext);
  const { settings } = React.useContext(SettingsContext);

  const [channelIndex, setChannelIndex] = useState(1);
  const [channelSlideDir, setChannelSlideDir] = useState(1);
  const [leavingChannelIndex, setLeavingChannelIndex] = useState(null);
  const prevChannelIndexRef = useRef(1);
  const skipChannelAnimRef = useRef(true);
  const [hubFocus, setHubFocus] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState('input');
  const [searchResultIndex, setSearchResultIndex] = useState(0);
  const searchInputRef = useRef(null);
  const [settingsFocus, setSettingsFocus] = useState(1);
  const [settingsTabId, setSettingsTabId] = useState('interface');
  const [shelfIndex, setShelfIndex] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [librarySort, setLibrarySort] = useState('titles');
  const [hubScale, setHubScale] = useState(1);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [gameOptionsGame, setGameOptionsGame] = useState(null);
  const [focusZone, setFocusZone] = useState('content');
  const [filterFocus, setFilterFocus] = useState(0);
  const [padLayout, setPadLayout] = useState(null);
  const tileRefs = useRef([]);
  const stageRef = useRef(null);
  const lastSoundRef = useRef(0);
  const lastLaunchRef = useRef(0);
  const lastNavDedupeRef = useRef({ key: null, at: 0 });

  const channel = METRO_CHANNELS[channelIndex];
  const gamertag = settings.sessionGamertag || 'Player';
  const avatarSrc = settings.sessionAvatar || DEFAULT_AVATAR;

  const sortedGames = useMemo(
    () => [...games].sort((a, b) => a.name.localeCompare(b.name)),
    [games]
  );

  const pinnedGames = useMemo(
    () => games.filter((g) => g.isFavorite).slice(0, 8),
    [games]
  );

  const recentSorted = useMemo(() => {
    if (recentGames.length > 0) return recentGames;
    return sortedGames.slice(0, 12);
  }, [recentGames, sortedGames]);

  const lastPlayedGame = useMemo(() => {
    const withDate = [...games].filter((g) => g.lastPlayed);
    if (withDate.length > 0) {
      withDate.sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed));
      return withDate[0];
    }
    return recentSorted[0] || null;
  }, [games, recentSorted]);

  const mostPlayedGame = useMemo(() => {
    const sorted = [...games].sort((a, b) => (b.timesPlayed || 0) - (a.timesPlayed || 0));
    return sorted[0]?.timesPlayed ? sorted[0] : null;
  }, [games]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return games.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 24);
  }, [games, searchQuery]);

  const gamesHub = useMemo(() => {
    const featured = recentSorted[0]
      ? { ...gameToTile(recentSorted[0]), focusId: 2, type: 'game' }
      : { ...GAMES_HUB_TILES.featuredFallback };
    const slot1 = sortedGames[1]
      ? { ...gameToTile(sortedGames[1]), focusId: 3 }
      : sortedGames[0] && recentSorted[0]?.id !== sortedGames[0]?.id
        ? { ...gameToTile(sortedGames[0]), focusId: 3 }
        : { ...GAMES_HUB_TILES.slot1Fallback };
    const slot2 = sortedGames[2]
      ? { ...gameToTile(sortedGames[2]), focusId: 4 }
      : { ...GAMES_HUB_TILES.slot2Fallback };

    return {
      myGames: GAMES_HUB_TILES.myGames,
      settings: GAMES_HUB_TILES.settings,
      featured,
      slot1,
      slot2
    };
  }, [recentSorted, sortedGames]);

  const homeHub = useMemo(() => {
    const favoriteGame = pinnedGames[0] ?? null;

    const featured = lastPlayedGame
      ? { ...gameToTile(lastPlayedGame), focusId: 2, type: 'game', sectionTag: 'Last Played' }
      : {
        ...GAMES_HUB_TILES.featuredFallback,
        id: 'home-recent-empty',
        label: 'No recent game',
        sectionTag: 'Last Played',
        action: 'openRecentLibrary'
      };

    const slot1 = favoriteGame
      ? { ...gameToTile(favoriteGame), focusId: 3, type: 'game', sectionTag: 'Favorite' }
      : {
        ...GAMES_HUB_TILES.slot1Fallback,
        id: 'home-fav-empty',
        label: 'No favorite yet',
        sectionTag: 'Favorite',
        action: 'openLibrary'
      };

    const slot2 = mostPlayedGame
      ? { ...gameToTile(mostPlayedGame), focusId: 4, type: 'game', sectionTag: 'Most Played' }
      : {
        ...GAMES_HUB_TILES.slot2Fallback,
        id: 'home-most-empty',
        label: 'No plays yet',
        sectionTag: 'Most Played',
        action: 'openLibrary'
      };

    return {
      isHome: true,
      myGames: {
        ...GAMES_HUB_TILES.myGames,
        id: 'home-game-list',
        label: 'Game List',
        sectionTag: 'Game List',
        action: 'openLibrary',
        showCaption: true
      },
      settings: null,
      featured,
      slot1,
      slot2
    };
  }, [lastPlayedGame, mostPlayedGame, pinnedGames]);

  const activeHub = channel.id === 'home' ? homeHub : gamesHub;

  const hubTilesByFocus = useMemo(() => ({
    0: activeHub.myGames,
    1: activeHub.settings,
    2: activeHub.featured,
    3: activeHub.slot1,
    4: activeHub.slot2
  }), [activeHub]);

  const focusedHubTile = hubTilesByFocus[hubFocus];

  const libraryGames = useMemo(() => {
    let list = [...games];
    if (libraryFilter === 'recent') {
      list = recentGames.length > 0 ? recentGames.filter((g) => games.some((x) => x.id === g.id)) : list;
    } else if (libraryFilter === 'pinned') {
      list = list.filter((g) => g.isFavorite);
    }
    if (librarySort === 'titles') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0));
    }
    return list.map((g) => gameToTile(g));
  }, [games, recentGames, libraryFilter, librarySort]);

  const shelfTiles = useMemo(() => {
    if (libraryOpen) return libraryGames;
    return [];
  }, [libraryOpen, libraryGames]);

  const settingsTilesByFocus = useMemo(() => {
    const map = {};
    SETTINGS_BLADE_TILES.forEach((tile) => { map[tile.focusId] = tile; });
    return map;
  }, []);

  const focusedSettingsTile = settingsTilesByFocus[settingsFocus];

  const isOverlayOpen = appSettingsOpen || profileEditorOpen || Boolean(gameOptionsGame);
  const isHubLayout = (channel.layout === 'games-hub' || channel.layout === 'home-dashboard') && !libraryOpen && !isOverlayOpen;
  const isSearchLayout = channel.layout === 'search' && !libraryOpen && !isOverlayOpen;
  const isSettingsLayout = channel.layout === 'settings-grid' && !libraryOpen && !isOverlayOpen;
  const focusedShelfTile = shelfTiles[shelfIndex] || null;

  const libraryFilterLabel = libraryFilter === 'recent' ? 'recently played' : libraryFilter === 'pinned' ? 'pinned games' : 'all games';
  const librarySortLabel = librarySort === 'recent' ? 'recent' : 'titles';

  const goToChannel = useCallback((index, navDirection) => {
    if (index === channelIndex) return;

    const slideDir = navDirection ?? (index > channelIndex ? 1 : -1);
    setChannelSlideDir(slideDir);

    const now = Date.now();
    if (now - lastSoundRef.current > 120) {
      playSound(slideDir < 0 ? METRO_SOUNDS.left : METRO_SOUNDS.right);
      lastSoundRef.current = now;
    }

    setChannelIndex(index);
  }, [channelIndex]);

  useEffect(() => {
    if (shelfIndex >= shelfTiles.length) {
      setShelfIndex(Math.max(0, shelfTiles.length - 1));
    }
  }, [shelfIndex, shelfTiles.length]);

  useEffect(() => {
    if (skipChannelAnimRef.current) {
      skipChannelAnimRef.current = false;
      prevChannelIndexRef.current = channelIndex;
      return undefined;
    }
    if (prevChannelIndexRef.current === channelIndex) return undefined;

    setLeavingChannelIndex(prevChannelIndexRef.current);
    prevChannelIndexRef.current = channelIndex;
    const timer = setTimeout(() => setLeavingChannelIndex(null), 420);
    return () => clearTimeout(timer);
  }, [channelIndex]);

  useEffect(() => {
    tileRefs.current = [];
  }, [channelIndex, libraryOpen]);

  useEffect(() => {
    setHubFocus(2);
    setSearchQuery('');
    setSearchFocus('input');
    setSearchResultIndex(0);
    setSettingsFocus(1);
    setShelfIndex(0);
    setLibraryOpen(false);
    setLibraryFilter('all');
    setLibrarySort('titles');
    setFocusZone('content');
    setFilterFocus(0);
  }, [channelIndex]);

  useEffect(() => {
    if (libraryOpen) {
      setFocusZone('content');
      setFilterFocus(0);
    }
  }, [libraryOpen]);

  useEffect(() => {
    window.electronAPI?.setFullScreen?.(true);
    window.electronAPI?.focusMainWindow?.();
    window.focus?.();
  }, []);

  useEffect(() => {
    const sync = () => setPadLayout(getActiveGamepadLayout());
    sync();
    const id = setInterval(sync, 500);
    window.addEventListener('gamepadconnected', sync);
    return () => {
      clearInterval(id);
      window.removeEventListener('gamepadconnected', sync);
    };
  }, []);

  const ps = padLayout === 'playstation' || padLayout === 'playstation-alt';
  const hintConfirm = ps ? '✕' : 'A';
  const hintBack = ps ? '○' : 'B';
  const hintX = ps ? '□' : 'X';
  const hintY = ps ? '△' : 'Y';

  const launchGame = useCallback((game) => {
    if (!game?.path) return;
    lastLaunchRef.current = Date.now();
    onLaunch(game);
  }, [onLaunch]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || libraryOpen) return undefined;
    if (channel.layout !== 'games-hub' && channel.layout !== 'settings-grid' && channel.layout !== 'home-dashboard') return undefined;

    const gridBase = channel.layout === 'settings-grid' ? SETTINGS_GRID_BASE : HUB_BASE;

    const updateScale = () => {
      const { width, height } = stage.getBoundingClientRect();
      const padX = 64;
      const padY = 48;
      const scaleX = (width - padX) / gridBase.width;
      const scaleY = (height - padY) / gridBase.height;
      setHubScale(Math.min(Math.max(Math.min(scaleX, scaleY), 0.42), 1.4));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [libraryOpen, channelIndex, channel.layout]);

  const openAppSettings = useCallback((tabId = 'interface') => {
    resetGamepadHoldState();
    setGameOptionsGame(null);
    setProfileEditorOpen(false);
    setSettingsTabId(tabId);
    setAppSettingsOpen(true);
  }, []);

  const openProfileEditor = useCallback(() => {
    resetGamepadHoldState();
    setGameOptionsGame(null);
    setAppSettingsOpen(false);
    setProfileEditorOpen(true);
  }, []);

  const openSettingsChannel = useCallback(() => {
    const idx = METRO_CHANNELS.findIndex((c) => c.id === 'settings');
    if (idx >= 0) {
      playSound(METRO_SOUNDS.select);
      goToChannel(idx);
      setSettingsFocus(1);
    }
  }, [goToChannel]);

  const cycleLibraryFilter = useCallback(() => {
    setLibraryFilter((f) => (f === 'all' ? 'recent' : f === 'recent' ? 'pinned' : 'all'));
    setShelfIndex(0);
  }, []);

  const cycleLibrarySort = useCallback(() => {
    setLibrarySort((s) => (s === 'titles' ? 'recent' : 'titles'));
    setShelfIndex(0);
  }, []);

  const openGameOptions = useCallback((game) => {
    if (!game) return;
    setAppSettingsOpen(false);
    setProfileEditorOpen(false);
    setGameOptionsGame(game);
  }, []);

  useEffect(() => {
    if (libraryOpen || isHubLayout || isSettingsLayout || isSearchLayout || isOverlayOpen) return undefined;
    tileRefs.current[shelfIndex]?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    return undefined;
  }, [shelfIndex, libraryOpen, channelIndex, isHubLayout, isSettingsLayout, isSearchLayout, isOverlayOpen]);

  useEffect(() => {
    if (!libraryOpen || isOverlayOpen || focusZone !== 'content') return undefined;
    tileRefs.current[shelfIndex]?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    return undefined;
  }, [focusZone, isOverlayOpen, libraryOpen, shelfIndex]);

  useEffect(() => {
    if (libraryOpen || !isHubLayout || isOverlayOpen) return undefined;
    tileRefs.current[hubFocus]?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    return undefined;
  }, [hubFocus, libraryOpen, channelIndex, isHubLayout, isOverlayOpen]);

  useEffect(() => {
    if (isOverlayOpen) return undefined;
    if (!libraryOpen && isSettingsLayout) {
      tileRefs.current[settingsFocus]?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    }
    return undefined;
  }, [settingsFocus, libraryOpen, channelIndex, isSettingsLayout, isOverlayOpen]);

  const runTileAction = useCallback((tile) => {
    if (!tile) return;

    switch (tile.action) {
      case 'openLibrary': {
        const gamesIdx = METRO_CHANNELS.findIndex((c) => c.id === 'games');
        if (gamesIdx >= 0) goToChannel(gamesIdx);
        setLibraryOpen(true);
        setShelfIndex(0);
        break;
      }
      case 'openPinnedLibrary': {
        const gamesIdx = METRO_CHANNELS.findIndex((c) => c.id === 'games');
        if (gamesIdx >= 0) goToChannel(gamesIdx);
        setLibraryFilter('pinned');
        setLibrarySort('titles');
        setLibraryOpen(true);
        setShelfIndex(0);
        break;
      }
      case 'openRecentLibrary': {
        const gamesIdx = METRO_CHANNELS.findIndex((c) => c.id === 'games');
        if (gamesIdx >= 0) goToChannel(gamesIdx);
        setLibraryFilter('recent');
        setLibrarySort('recent');
        setLibraryOpen(true);
        setShelfIndex(0);
        break;
      }
      case 'openSettings':
        openAppSettings();
        break;
      case 'openSettingsChannel':
        openSettingsChannel();
        break;
      case 'openSettingsTab':
        if (tile.settingsTab) openAppSettings(tile.settingsTab);
        break;
      case 'switchProfile':
        onSwitchProfile?.();
        break;
      case 'openProfileEditor':
        openProfileEditor();
        break;
      case 'exit':
        onExit();
        break;
      default:
        break;
    }
  }, [goToChannel, onExit, onSwitchProfile, openAppSettings, openProfileEditor, openSettingsChannel]);

  const handleToggleFavorite = useCallback(() => {
    if (isOverlayOpen) return;

    let targetGame = null;
    if (libraryOpen && focusZone === 'content' && focusedShelfTile?.game) {
      targetGame = focusedShelfTile.game;
    } else if (isHubLayout && focusedHubTile?.isUserGame && focusedHubTile.game) {
      targetGame = focusedHubTile.game;
    } else if (isSearchLayout && searchFocus === 'results' && searchResults[searchResultIndex]) {
      targetGame = searchResults[searchResultIndex];
    }

    if (targetGame) {
      playSound(METRO_SOUNDS.select);
      toggleFavorite(targetGame.id);
    }
  }, [
    focusZone,
    focusedHubTile,
    focusedShelfTile,
    isHubLayout,
    isOverlayOpen,
    isSearchLayout,
    libraryOpen,
    searchFocus,
    searchResultIndex,
    searchResults,
    toggleFavorite
  ]);

  const hubShowsFavoriteHint = isHubLayout && Boolean(focusedHubTile?.isUserGame && focusedHubTile.game);

  const handleContextY = useCallback(() => {
    if (isOverlayOpen) return;

    if (libraryOpen) {
      if (focusZone === 'filters') {
        if (filterFocus === 0) cycleLibraryFilter();
        else cycleLibrarySort();
        return;
      }
      if (focusedShelfTile?.game) {
        openGameOptions(focusedShelfTile.game);
      }
      return;
    }

    if (isHubLayout) {
      if (focusedHubTile?.action === 'openSettings' || focusedHubTile?.action === 'openSettingsChannel') {
        openSettingsChannel();
        return;
      }
      if (focusedHubTile?.isUserGame && focusedHubTile.game) {
        openGameOptions(focusedHubTile.game);
        return;
      }
      if (focusedHubTile?.action === 'openLibrary') {
        runTileAction(focusedHubTile);
      }
      return;
    }

    if (focusedShelfTile?.action === 'openSettings') {
      openAppSettings();
      return;
    }
    if (focusedShelfTile?.isUserGame && focusedShelfTile.game) {
      openGameOptions(focusedShelfTile.game);
    }
  }, [
    cycleLibraryFilter,
    cycleLibrarySort,
    filterFocus,
    focusZone,
    focusedHubTile,
    focusedShelfTile,
    isHubLayout,
    isOverlayOpen,
    libraryOpen,
    openAppSettings,
    openGameOptions,
    openSettingsChannel,
    runTileAction
  ]);

  const moveChannel = useCallback((direction) => {
    const next = (channelIndex + direction + METRO_CHANNELS.length) % METRO_CHANNELS.length;
    goToChannel(next, direction);
  }, [channelIndex, goToChannel]);

  const activateSearchResult = useCallback((index) => {
    const game = searchResults[index];
    if (game) launchGame(game);
  }, [launchGame, searchResults]);

  const moveSettingsFocus = useCallback((direction) => {
    const nav = SETTINGS_GRID_NAV[settingsFocus];
    if (!nav) return;
    const next = nav[direction];
    if (next !== undefined) {
      playSound(direction === 'left' || direction === 'up' ? METRO_SOUNDS.left : METRO_SOUNDS.right);
      setSettingsFocus(next);
    }
  }, [settingsFocus]);

  const activateSettingsTile = useCallback((tile, focusId) => {
    if (!tile || tile.disabled) return;
    setSettingsFocus(focusId);
    playSound(METRO_SOUNDS.select);
    if (tile.action) runTileAction(tile);
  }, [runTileAction]);

  const moveHubFocus = useCallback((direction) => {
    const navMap = channel.id === 'home' ? HOME_HUB_NAV : GAMES_HUB_NAV;
    const nav = navMap[hubFocus];
    if (!nav) return;
    const next = nav[direction];
    if (next !== undefined) {
      playSound(direction === 'left' || direction === 'up' ? METRO_SOUNDS.left : METRO_SOUNDS.right);
      setHubFocus(next);
    }
  }, [channel.id, hubFocus]);

  const handleCoverFailed = useCallback(async (game) => {
    const filename = game.path ? game.path.split(/[\\/]/).pop() : game.name;
    const details = await fetchGameCoverDetails(filename, game.titleId, xbox360DB);
    if (details?.coverUrl) {
      updateGame(game.id, {
        coverUrl: details.coverUrl,
        description: details.description || game.description,
        genre: details.genre || game.genre
      });
      return details.coverUrl;
    }
    return null;
  }, [updateGame, xbox360DB]);

  const activateHubTile = useCallback((tile, focusId) => {
    setHubFocus(focusId);
    playSound(METRO_SOUNDS.select);
    if (tile.action) {
      runTileAction(tile);
      return;
    }
    if (tile.isUserGame && tile.game) {
      launchGame(tile.game);
    }
  }, [launchGame, runTileAction]);

  const runShelfAction = useCallback(() => {
    if (!focusedShelfTile) return;
    playSound(METRO_SOUNDS.select);

    if (focusedShelfTile.action) {
      runTileAction(focusedShelfTile);
      return;
    }
    if (focusedShelfTile.isUserGame && focusedShelfTile.game) {
      launchGame(focusedShelfTile.game);
    }
  }, [focusedShelfTile, launchGame, runTileAction]);

  const handleBack = useCallback(() => {
    if (Date.now() - lastLaunchRef.current < 1500) return;
    playSound(METRO_SOUNDS.back);
    if (isOverlayOpen) {
      setAppSettingsOpen(false);
      setProfileEditorOpen(false);
      setGameOptionsGame(null);
      return;
    }
    if (libraryOpen) {
      setLibraryOpen(false);
      return;
    }
    if (channel.id === 'settings') {
      playSound(METRO_SOUNDS.back);
      const homeIdx = METRO_CHANNELS.findIndex((c) => c.id === 'home');
      goToChannel(homeIdx >= 0 ? homeIdx : 1);
      return;
    }
    if (isSearchLayout) {
      if (searchFocus === 'results') {
        setSearchFocus('input');
        requestAnimationFrame(() => searchInputRef.current?.focus());
        return;
      }
      if (searchQuery.length > 0) {
        setSearchQuery((q) => q.slice(0, -1));
        requestAnimationFrame(() => searchInputRef.current?.focus());
        return;
      }
      const homeIdx = METRO_CHANNELS.findIndex((c) => c.id === 'home');
      if (homeIdx >= 0) goToChannel(homeIdx);
      return;
    }
    onExit();
  }, [channel.id, goToChannel, isOverlayOpen, isSearchLayout, libraryOpen, onExit, searchFocus, searchQuery]);

  const handleNav = useCallback((key, { fromGamepad = false } = {}) => {
    if (!fromGamepad) {
      const now = Date.now();
      if (lastNavDedupeRef.current.key === key && now - lastNavDedupeRef.current.at < 100) {
        return;
      }
      lastNavDedupeRef.current = { key, at: now };
    }

    if (libraryOpen) {
      if (focusZone === 'filters') {
        if (key === 'left') {
          playSound(METRO_SOUNDS.left);
          setFilterFocus(0);
        } else if (key === 'right') {
          playSound(METRO_SOUNDS.right);
          setFilterFocus(1);
        } else if (key === 'down') {
          playSound(METRO_SOUNDS.right);
          setFocusZone('content');
        }
        return;
      }

      const len = shelfTiles.length;
      if (key === 'left') {
        playSound(METRO_SOUNDS.left);
        setShelfIndex((i) => Math.max(0, i - 1));
      } else if (key === 'right') {
        playSound(METRO_SOUNDS.right);
        setShelfIndex((i) => Math.min(len - 1, i + 1));
      } else if (key === 'up') {
        playSound(METRO_SOUNDS.left);
        setFocusZone('filters');
      }
      return;
    }

    if (!isHubLayout && !isSettingsLayout && !isSearchLayout) {
      const len = shelfTiles.length;
      if (key === 'left') {
        playSound(METRO_SOUNDS.left);
        setShelfIndex((i) => Math.max(0, i - 1));
      } else if (key === 'right') {
        playSound(METRO_SOUNDS.right);
        setShelfIndex((i) => Math.min(len - 1, i + 1));
      }
      return;
    }

    if (isSearchLayout) {
      if (searchFocus === 'input') {
        if (key === 'down' && searchResults.length > 0) {
          playSound(METRO_SOUNDS.right);
          setSearchFocus('results');
          setSearchResultIndex(0);
        }
        return;
      }
      if (key === 'up') {
        playSound(METRO_SOUNDS.left);
        if (searchResultIndex <= 0) setSearchFocus('input');
        else setSearchResultIndex((i) => Math.max(0, i - 1));
      } else if (key === 'down') {
        playSound(METRO_SOUNDS.right);
        setSearchResultIndex((i) => Math.min(searchResults.length - 1, i + 1));
      }
      return;
    }

    if (isSettingsLayout) {
      if (key === 'left') moveSettingsFocus('left');
      else if (key === 'right') moveSettingsFocus('right');
      else if (key === 'up') moveSettingsFocus('up');
      else if (key === 'down') moveSettingsFocus('down');
      return;
    }

    if (key === 'left') moveHubFocus('left');
    else if (key === 'right') moveHubFocus('right');
    else if (key === 'up') moveHubFocus('up');
    else if (key === 'down') moveHubFocus('down');
  }, [focusZone, isHubLayout, isSearchLayout, isSettingsLayout, libraryOpen, moveHubFocus, moveSettingsFocus, searchFocus, searchResults.length, shelfTiles.length]);

  useEffect(() => {
    if (isOverlayOpen) {
      resetGamepadHoldState();
    }
  }, [isOverlayOpen]);

  useEffect(() => {
    if (isSearchLayout && !isOverlayOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [channelIndex, isOverlayOpen, isSearchLayout]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isOverlayOpen) return;

      const typing = isTextInputActive();
      if (!typing && wasRecentGamepadInput() && isLikelyGamepadEchoKey(event.key)) {
        event.preventDefault();
        return;
      }

      const navKey = NAV_KEY_MAP[event.key] || (!typing ? WASD_KEY_MAP[event.key] : undefined);
      if (navKey) {
        if (isSearchLayout && searchFocus === 'input') return;
        markKeyboardInput();
        event.preventDefault();
        if (libraryOpen || isHubLayout || isSettingsLayout || isSearchLayout) {
          handleNav(navKey);
        } else if (navKey === 'left') {
          handleNav('left');
        } else if (navKey === 'right') {
          handleNav('right');
        } else if (navKey === 'up') {
          moveChannel(-1);
        } else if (navKey === 'down') {
          moveChannel(1);
        }
        return;
      }

      if (event.key === 'q' || event.key === 'Q' || event.key === 'PageUp') {
        if (wasRecentGamepadInput()) {
          event.preventDefault();
          return;
        }
        markKeyboardInput();
        event.preventDefault();
        moveChannel(-1);
        return;
      }
      if (event.key === 'e' || event.key === 'E' || event.key === 'PageDown') {
        if (wasRecentGamepadInput()) {
          event.preventDefault();
          return;
        }
        markKeyboardInput();
        event.preventDefault();
        moveChannel(1);
        return;
      }

      switch (event.key) {
        case 'Escape':
        case 'Backspace':
          if (typing || (isSearchLayout && searchFocus === 'input')) {
            return;
          }
          if (wasRecentGamepadInput()) {
            event.preventDefault();
            return;
          }
          markKeyboardInput();
          event.preventDefault();
          handleBack();
          break;
        case 'Delete':
          if (typing) return;
          break;
        case 'Enter':
          if (wasRecentGamepadInput()) {
            event.preventDefault();
            return;
          }
          markKeyboardInput();
          if (libraryOpen) {
            if (focusZone === 'filters') {
              if (filterFocus === 0) cycleLibraryFilter();
              else cycleLibrarySort();
            } else {
              runShelfAction();
            }
          } else if (isSearchLayout) {
            if (searchFocus === 'input' && searchResults.length > 0) {
              setSearchFocus('results');
              setSearchResultIndex(0);
            } else if (searchFocus === 'results') {
              activateSearchResult(searchResultIndex);
            }
          } else if (isSettingsLayout && focusedSettingsTile) {
            activateSettingsTile(focusedSettingsTile, settingsFocus);
          } else if (isHubLayout && focusedHubTile) {
            activateHubTile(focusedHubTile, hubFocus);
          } else {
            runShelfAction();
          }
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [activateHubTile, activateSearchResult, activateSettingsTile, cycleLibraryFilter, cycleLibrarySort, filterFocus, focusZone, focusedHubTile, focusedSettingsTile, handleBack, handleNav, hubFocus, isHubLayout, isSearchLayout, isSettingsLayout, isOverlayOpen, libraryOpen, moveChannel, runShelfAction, searchFocus, searchResultIndex, settingsFocus]);

  useGamepad({
    left: () => { if (!isOverlayOpen) handleNav('left', { fromGamepad: true }); },
    right: () => { if (!isOverlayOpen) handleNav('right', { fromGamepad: true }); },
    up: () => {
      if (isOverlayOpen) return;
      if (libraryOpen) {
        handleNav('up', { fromGamepad: true });
        return;
      }
      if (isHubLayout || isSettingsLayout || isSearchLayout) handleNav('up', { fromGamepad: true });
      else moveChannel(-1);
    },
    down: () => {
      if (isOverlayOpen) return;
      if (libraryOpen) {
        handleNav('down', { fromGamepad: true });
        return;
      }
      if (isHubLayout || isSettingsLayout || isSearchLayout) handleNav('down', { fromGamepad: true });
      else moveChannel(1);
    },
    prevTab: () => { if (!isOverlayOpen) moveChannel(-1); },
    nextTab: () => { if (!isOverlayOpen) moveChannel(1); },
    confirm: () => {
      if (isOverlayOpen) return;
      if (libraryOpen) {
        if (focusZone === 'filters') {
          if (filterFocus === 0) cycleLibraryFilter();
          else cycleLibrarySort();
        } else {
          runShelfAction();
        }
        return;
      }
      if (isSearchLayout) {
        if (searchFocus === 'input' && searchResults.length > 0) {
          setSearchFocus('results');
          setSearchResultIndex(0);
        } else if (searchFocus === 'results') {
          activateSearchResult(searchResultIndex);
        }
        return;
      }
      if (isSettingsLayout && focusedSettingsTile) {
        activateSettingsTile(focusedSettingsTile, settingsFocus);
        return;
      }
      if (isHubLayout && focusedHubTile) {
        activateHubTile(focusedHubTile, hubFocus);
      }
    },
    back: handleBack,
    menu: () => {
      if (isOverlayOpen) {
        setAppSettingsOpen(false);
        setProfileEditorOpen(false);
        setGameOptionsGame(null);
      } else {
        openSettingsChannel();
      }
    },
    actionY: () => { if (!isOverlayOpen) handleContextY(); },
    actionX: () => { handleToggleFavorite(); }
  }, true, 100);

  const renderTileContent = (tile, large = false) => {
    if (!tile) return null;
    if (tile.isUserGame) {
      return (
        <CoverImage
          gameName={tile.label}
          coverUrl={tile.coverUrl}
          alt={tile.label}
          placeholderSize={large ? 64 : 40}
          onCoverFailed={() => handleCoverFailed(tile.game)}
        />
      );
    }
    return <img src={tile.image} alt={tile.label} draggable={false} />;
  };

  const renderHubCaption = (tile) => {
    if (tile.sectionTag) {
      return (
        <span className="metro-hub__tile-caption-wrap">
          <span className="metro-hub__tile-tag">{tile.sectionTag}</span>
          <span className="metro-hub__tile-caption">{tile.label}</span>
        </span>
      );
    }
    return <span className="metro-hub__tile-caption">{tile.label}</span>;
  };

  const renderHubGrid = (hub) => {
    const leftTop = hub.myGames;
    const leftBottom = hub.settings;
    const needsBottomLeft = !hub.isHome;
    if (!leftTop?.image || !hub.featured || !hub.slot1 || !hub.slot2 || (needsBottomLeft && !leftBottom?.image)) {
      return (
        <div className="metro-dash__empty">
          <p>Unable to load dashboard tiles.</p>
        </div>
      );
    }

    return (
      <div className="metro-hub-scaler" style={{ transform: `scale(${hubScale})` }}>
        <div className={`metro-hub${hub.isHome ? ' metro-hub--home' : ''}`}>
          <button
            type="button"
            ref={(n) => { tileRefs.current[0] = n; }}
            className={`metro-hub__tile metro-hub__tile--hub metro-hub__tile--mygames${hubFocus === 0 ? ' is-focused' : ''}`}
            onClick={() => activateHubTile(leftTop, 0)}
          >
            <img src={leftTop.image} alt={leftTop.label} draggable={false} />
            {(leftTop.showCaption || leftTop.sectionTag) && renderHubCaption(leftTop)}
          </button>

          {leftBottom && (
            <button
              type="button"
              ref={(n) => { tileRefs.current[1] = n; }}
              className={`metro-hub__tile metro-hub__tile--app metro-hub__tile--settings${hubFocus === 1 ? ' is-focused' : ''}`}
              onClick={() => activateHubTile(leftBottom, 1)}
            >
              <img src={leftBottom.image} alt={leftBottom.label} draggable={false} />
              <span className="metro-hub__tile-caption">{leftBottom.label}</span>
            </button>
          )}

          <button
            type="button"
            ref={(n) => { tileRefs.current[2] = n; }}
            className={`metro-hub__tile metro-hub__tile--featured${hubFocus === 2 ? ' is-focused' : ''}`}
            onClick={() => activateHubTile(hub.featured, 2)}
          >
            {renderTileContent(hub.featured, true)}
            {hub.featured.isUserGame && hub.featured.game?.isFavorite && (
              <span className="metro-hub__tile-fav" aria-hidden="true">♥</span>
            )}
            {renderHubCaption(hub.featured)}
          </button>

          <button
            type="button"
            ref={(n) => { tileRefs.current[3] = n; }}
            className={`metro-hub__tile metro-hub__tile--slot metro-hub__tile--slot1${hubFocus === 3 ? ' is-focused' : ''}`}
            onClick={() => activateHubTile(hub.slot1, 3)}
          >
            {renderTileContent(hub.slot1)}
            {hub.slot1.isUserGame && hub.slot1.game?.isFavorite && (
              <span className="metro-hub__tile-fav" aria-hidden="true">♥</span>
            )}
            {renderHubCaption(hub.slot1)}
          </button>

          <button
            type="button"
            ref={(n) => { tileRefs.current[4] = n; }}
            className={`metro-hub__tile metro-hub__tile--slot metro-hub__tile--slot2${hubFocus === 4 ? ' is-focused' : ''}`}
            onClick={() => activateHubTile(hub.slot2, 4)}
          >
            {renderTileContent(hub.slot2)}
            {hub.slot2.isUserGame && hub.slot2.game?.isFavorite && (
              <span className="metro-hub__tile-fav" aria-hidden="true">♥</span>
            )}
            {renderHubCaption(hub.slot2)}
          </button>
        </div>
      </div>
    );
  };

  const renderSettingsGrid = () => (
    <div className="metro-hub-scaler" style={{ transform: `scale(${hubScale})` }}>
      <div className="metro-settings-grid">
        {SETTINGS_BLADE_TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            ref={(n) => { tileRefs.current[tile.focusId] = n; }}
            className={`metro-settings-grid__tile${settingsFocus === tile.focusId ? ' is-focused' : ''}${tile.disabled ? ' is-disabled' : ''}`}
            onClick={() => activateSettingsTile(tile, tile.focusId)}
            disabled={tile.disabled}
          >
            <img src={tile.image} alt="" className="metro-settings-grid__icon" draggable={false} />
            <span className="metro-settings-grid__label">{tile.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderLibraryCase = (tile, index) => (
    <button
      key={tile.id}
      type="button"
      ref={(n) => { tileRefs.current[index] = n; }}
      className={`metro-library__case${focusZone === 'content' && index === shelfIndex ? ' is-focused' : ''}`}
      onClick={() => { setFocusZone('content'); setShelfIndex(index); runShelfAction(); }}
    >
      <div className="metro-library__case-cover">
        <CoverImage
          gameName={tile.label}
          coverUrl={tile.coverUrl}
          alt={tile.label}
          placeholderSize={72}
          onCoverFailed={() => handleCoverFailed(tile.game)}
        />
      </div>
      <span className="metro-library__case-label">{tile.label}</span>
    </button>
  );

  const renderLibraryView = () => (
    <div className="metro-library">
      <header className="metro-library__header">
        <div className="metro-library__filters">
          <button
            type="button"
            className={`metro-library__filter${focusZone === 'filters' && filterFocus === 0 ? ' is-focused' : ''}`}
            onClick={() => {
              setFocusZone('filters');
              setFilterFocus(0);
              cycleLibraryFilter();
            }}
          >
            <span className="metro-library__filter-label">▼ show me</span>
            <span className="metro-library__filter-value">{libraryFilterLabel}</span>
          </button>
          <button
            type="button"
            className={`metro-library__filter${focusZone === 'filters' && filterFocus === 1 ? ' is-focused' : ''}`}
            onClick={() => {
              setFocusZone('filters');
              setFilterFocus(1);
              cycleLibrarySort();
            }}
          >
            <span className="metro-library__filter-label">▼ sort</span>
            <span className="metro-library__filter-value">{librarySortLabel}</span>
          </button>
        </div>
        <div className="metro-library__title-block">
          <h2 className="metro-library__heading">My Games</h2>
          <p className="metro-library__count">{Math.min(shelfIndex + 1, libraryGames.length)} of {libraryGames.length}</p>
        </div>
      </header>
      <div className="metro-library__shelf">
        {libraryGames.length > 0 ? (
          libraryGames.map((tile, index) => renderLibraryCase(tile, index))
        ) : (
          <p className="metro-library__empty">No games match this filter.</p>
        )}
      </div>
    </div>
  );

  const renderShelfTile = (tile, index, { isSetting = false } = {}) => {
    const faceClass = tile.appTile ? 'metro-dash__tile-face metro-dash__tile-face--app' : 'metro-dash__tile-face';
    return (
      <button
        key={tile.id}
        type="button"
        ref={(n) => { tileRefs.current[index] = n; }}
        className={`metro-dash__tile${isSetting ? ' metro-dash__tile--setting' : ''}${index === shelfIndex ? ' is-focused' : ''}`}
        onClick={() => { setShelfIndex(index); runShelfAction(); }}
      >
        <div className={faceClass}>
          {tile.isUserGame ? renderTileContent(tile) : (
            <img src={tile.image} alt={tile.label} draggable={false} />
          )}
        </div>
        <span className="metro-dash__tile-label">{tile.label}</span>
      </button>
    );
  };

  const bgStyle = channel.background
    ? { backgroundImage: `url("${channel.background}")` }
    : undefined;

  const renderStageContentForChannel = (ch) => {
    if (libraryOpen) return renderLibraryView();
    if (ch.layout === 'settings-grid') return renderSettingsGrid();
    if (ch.layout === 'home-dashboard') return renderHubGrid(homeHub);
    if (ch.layout === 'games-hub') return renderHubGrid(gamesHub);
    if (ch.layout === 'search') {
      return (
        <MetroSearchView
          query={searchQuery}
          onQueryChange={setSearchQuery}
          results={searchResults}
          searchFocus={searchFocus}
          resultIndex={searchResultIndex}
          inputRef={searchInputRef}
          tileRefs={tileRefs}
          onActivateResult={activateSearchResult}
          onCoverFailed={handleCoverFailed}
          onInputFocus={() => setSearchFocus('input')}
        />
      );
    }
    if (shelfTiles.length > 0) {
      return (
        <div className="metro-dash__shelf">
          {shelfTiles.map((tile, index) => renderShelfTile(tile, index))}
        </div>
      );
    }
    return <div className="metro-dash__empty"><p>No content for this channel.</p></div>;
  };

  const channelBgStyle = useCallback((ch) => (
    ch?.background ? { backgroundImage: `url("${ch.background}")` } : undefined
  ), []);

  const slideAnimClass = channelSlideDir >= 0 ? 'fwd' : 'back';

  const activeLabel = libraryOpen
    ? (focusedShelfTile?.label || 'My Games')
    : isSearchLayout
      ? (searchFocus === 'input' ? 'Search' : searchResults[searchResultIndex]?.name)
      : isSettingsLayout
        ? focusedSettingsTile?.label
        : (isHubLayout ? focusedHubTile?.label : focusedShelfTile?.label);

  const stageContent = renderStageContentForChannel(channel);
  const leavingChannel = leavingChannelIndex !== null ? METRO_CHANNELS[leavingChannelIndex] : null;

  const liveGameOptions = gameOptionsGame
    ? games.find((g) => g.id === gameOptionsGame.id) || gameOptionsGame
    : null;

  return (
    <div className={`metro-dash${channel.layout ? ` metro-dash--${channel.layout}` : ''}${libraryOpen ? ' metro-dash--library' : ''}`} data-channel={channel.id}>
      {!libraryOpen && leavingChannel && (
        <div
          className={`metro-dash__bg metro-dash__bg--leave metro-dash__bg--leave-${slideAnimClass}`}
          style={channelBgStyle(leavingChannel)}
        />
      )}
      {!libraryOpen && bgStyle && (
        <div
          className={`metro-dash__bg${leavingChannel ? ` metro-dash__bg--enter metro-dash__bg--enter-${slideAnimClass}` : ''}`}
          style={bgStyle}
        />
      )}
      <div className="metro-dash__shade" />

      {!libraryOpen && (
      <header className="metro-dash__header">
        <div className="metro-dash__header-spacer" />
        <nav className="metro-dash__channels" role="tablist">
          {METRO_CHANNELS.map((ch, index) => (
            <button
              key={ch.id}
              type="button"
              role="tab"
              aria-selected={index === channelIndex}
              className={`metro-dash__channel${index === channelIndex ? ' is-active' : ''}`}
              onClick={() => goToChannel(index)}
            >
              {ch.label}
            </button>
          ))}
        </nav>
        <button type="button" className="metro-dash__profile" onClick={onSwitchProfile} title="Switch profile">
          <span className="metro-dash__gamertag">{gamertag}</span>
          <div className="metro-dash__avatar">
            <img src={avatarSrc} alt={gamertag} onError={(e) => { e.target.src = DEFAULT_AVATAR; }} />
          </div>
          <span className="metro-dash__status">Offline</span>
        </button>
      </header>
      )}

      <main className="metro-dash__stage" ref={stageRef}>
        {!libraryOpen && leavingChannel && (
          <div
            className={`metro-dash__stage-inner metro-dash__stage-inner--leave metro-dash__stage-inner--leave-${slideAnimClass}`}
            aria-hidden="true"
          >
            {renderStageContentForChannel(leavingChannel)}
          </div>
        )}
        <div
          className={`metro-dash__stage-inner${leavingChannel ? ` metro-dash__stage-inner--enter metro-dash__stage-inner--enter-${slideAnimClass}` : ''}`}
        >
          {stageContent}
        </div>
      </main>

      {!libraryOpen && (
      <footer className="metro-dash__footer">
        {activeLabel && <p className="metro-dash__focus-title">{activeLabel}</p>}
      </footer>
      )}

      <div className="metro-dash__hints">
        {libraryOpen ? (
          focusZone === 'filters' ? (
            <>
              <span><span className="metro-hint-btn metro-hint-btn--a">{hintConfirm}</span> Change filter</span>
              <span><span className="metro-hint-btn metro-hint-btn--y">{hintY}</span> Change filter</span>
              <span>↓ Games</span>
              <span><span className="metro-hint-btn metro-hint-btn--b">{hintBack}</span> Back</span>
              <span>LB / RB Channel</span>
            </>
          ) : (
            <>
              <span><span className="metro-hint-btn metro-hint-btn--a">{hintConfirm}</span> Launch</span>
              <span><span className="metro-hint-btn metro-hint-btn--b">{hintBack}</span> Back</span>
              <span><span className="metro-hint-btn metro-hint-btn--x">{hintX}</span> Favorite</span>
              <span><span className="metro-hint-btn metro-hint-btn--y">{hintY}</span> Options</span>
              <span>↑ Filters</span>
              <span>LB / RB Channel</span>
            </>
          )
        ) : isSearchLayout ? (
          <>
            <span><span className="metro-hint-btn metro-hint-btn--a">{hintConfirm}</span> {searchFocus === 'input' ? 'Results' : 'Launch'}</span>
            <span><span className="metro-hint-btn metro-hint-btn--b">{hintBack}</span> Back</span>
            <span>LB / RB Tab</span>
          </>
        ) : isSettingsLayout ? (
          <>
            <span><span className="metro-hint-btn metro-hint-btn--a">{hintConfirm}</span> Select</span>
            <span><span className="metro-hint-btn metro-hint-btn--b">{hintBack}</span> Back</span>
            <span>LB / RB Channel</span>
          </>
        ) : isHubLayout ? (
          <>
            <span><span className="metro-hint-btn metro-hint-btn--a">{hintConfirm}</span> Select</span>
            {hubShowsFavoriteHint && (
              <span><span className="metro-hint-btn metro-hint-btn--x">{hintX}</span> Favorite</span>
            )}
            <span><span className="metro-hint-btn metro-hint-btn--y">{hintY}</span> {channel.id === 'home' ? 'Options' : 'Options / Settings'}</span>
            <span><span className="metro-hint-btn metro-hint-btn--start">☰</span> Settings</span>
            <span>LB / RB Channel</span>
            <span>Q / E Channel</span>
            <span>WASD Move</span>
          </>
        ) : (
          <>
            <span><span className="metro-hint-btn metro-hint-btn--a">{hintConfirm}</span> Select</span>
            <span><span className="metro-hint-btn metro-hint-btn--y">{hintY}</span> Options</span>
            <span><span className="metro-hint-btn metro-hint-btn--start">☰</span> Settings</span>
            <span>LB / RB Channel</span>
            <span>Q / E Channel</span>
            <span>WASD Move</span>
          </>
        )}
        {!settings.emulatorPath && (
          <span className="metro-dash__hint-warn">Set Xenia path in Settings</span>
        )}
      </div>

      {appSettingsOpen && (
        <MetroSettingsPanel
          mode="app"
          initialTabId={settingsTabId}
          onClose={() => setAppSettingsOpen(false)}
          onSwitchProfile={onSwitchProfile}
          onExitConsole={onExit}
          updateGame={updateGame}
        />
      )}

      {profileEditorOpen && (
        <MetroProfilePanel
          onClose={() => setProfileEditorOpen(false)}
          onSwitchProfile={onSwitchProfile}
        />
      )}

      {liveGameOptions && (
        <MetroSettingsPanel
          mode="game"
          game={liveGameOptions}
          onClose={() => setGameOptionsGame(null)}
          onLaunchGame={onLaunch}
          onTogglePin={(g) => toggleFavorite(g.id)}
          updateGame={updateGame}
        />
      )}
    </div>
  );
};

export default MetroDashboard;
