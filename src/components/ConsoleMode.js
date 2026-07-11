import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Star, X } from 'lucide-react';
import { GameContext } from '../context/GameContext';
import { SettingsContext } from '../context/SettingsContext';
import CoverImage from './CoverImage';
import useGamepad, {
  wasRecentGamepadInput,
  resetGamepadHoldState,
  markKeyboardInput,
  isLikelyGamepadEchoKey
} from '../hooks/useGamepad';
import useOverlayKeyboardTrap from '../hooks/useOverlayKeyboardTrap';
import MetroSettingsPanel from './metro/MetroSettingsPanel';
import { fetchGameCoverDetails } from '../services/coverService';
import './ConsoleMode.css';

const TABS = [
  { id: 'all', label: 'My Games' },
  { id: 'recent', label: 'Recent' },
  { id: 'favorites', label: 'Favorites' }
];

const ConsoleMode = ({ onExit, onLaunch, onConfigure, onSwitchProfile }) => {
  const { games, recentGames, updateGame, toggleFavorite, xbox360DB } = React.useContext(GameContext);
  const { settings } = React.useContext(SettingsContext);
  const [activeTab, setActiveTab] = useState('all');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [gameOptionsGame, setGameOptionsGame] = useState(null);
  const shelfRef = useRef(null);
  const tileRefs = useRef([]);

  const isOverlayOpen = appSettingsOpen || Boolean(gameOptionsGame);

  const visibleGames = useMemo(() => {
    switch (activeTab) {
      case 'recent':
        return recentGames.length > 0 ? recentGames : games.slice(0, 12);
      case 'favorites':
        return games.filter((game) => game.isFavorite);
      default:
        return games;
    }
  }, [activeTab, games, recentGames]);

  const focusedGame = visibleGames[focusedIndex] || null;

  useEffect(() => {
    if (focusedIndex >= visibleGames.length) {
      setFocusedIndex(Math.max(0, visibleGames.length - 1));
    }
  }, [focusedIndex, visibleGames.length]);

  useEffect(() => {
    window.electronAPI?.setFullScreen?.(true);
    window.electronAPI?.focusMainWindow?.();
    window.focus?.();
  }, []);

  useEffect(() => {
    if (isOverlayOpen) {
      resetGamepadHoldState();
    }
  }, [isOverlayOpen]);

  useEffect(() => {
    if (isOverlayOpen) return undefined;
    const node = tileRefs.current[focusedIndex];
    node?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    return undefined;
  }, [focusedIndex, activeTab, isOverlayOpen]);

  useOverlayKeyboardTrap(isOverlayOpen, (event) => {
    if (event.key === 'Escape') {
      setAppSettingsOpen(false);
      setGameOptionsGame(null);
    }
  });

  const moveTab = useCallback((direction) => {
    setActiveTab((current) => {
      const currentIndex = TABS.findIndex((tab) => tab.id === current);
      const nextIndex = (currentIndex + direction + TABS.length) % TABS.length;
      return TABS[nextIndex].id;
    });
    setFocusedIndex(0);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isOverlayOpen) return;

      if (wasRecentGamepadInput() && isLikelyGamepadEchoKey(event.key)) {
        event.preventDefault();
        return;
      }

      const navMap = {
        ArrowLeft: () => setFocusedIndex((index) => Math.max(0, index - 1)),
        ArrowRight: () => setFocusedIndex((index) => Math.min(visibleGames.length - 1, index + 1)),
        a: () => setFocusedIndex((index) => Math.max(0, index - 1)),
        A: () => setFocusedIndex((index) => Math.max(0, index - 1)),
        d: () => setFocusedIndex((index) => Math.min(visibleGames.length - 1, index + 1)),
        D: () => setFocusedIndex((index) => Math.min(visibleGames.length - 1, index + 1)),
        q: () => moveTab(-1),
        Q: () => moveTab(-1),
        e: () => moveTab(1),
        E: () => moveTab(1),
        PageUp: () => moveTab(-1),
        PageDown: () => moveTab(1)
      };

      if (navMap[event.key]) {
        markKeyboardInput();
        event.preventDefault();
        navMap[event.key]();
        return;
      }

      if (event.key === 'Escape' || event.key === 'Backspace') {
        if (wasRecentGamepadInput()) {
          event.preventDefault();
          return;
        }
        markKeyboardInput();
        event.preventDefault();
        onExit();
      }
      if (event.key === 'Enter' && focusedGame) {
        if (wasRecentGamepadInput()) {
          event.preventDefault();
          return;
        }
        markKeyboardInput();
        onLaunch(focusedGame);
      }
      if (event.key === 'F11') {
        event.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedGame, isOverlayOpen, moveTab, onExit, onLaunch, visibleGames.length]);

  useGamepad(
    {
      left: () => { if (!isOverlayOpen) setFocusedIndex((index) => Math.max(0, index - 1)); },
      right: () => { if (!isOverlayOpen) setFocusedIndex((index) => Math.min(visibleGames.length - 1, index + 1)); },
      confirm: () => {
        if (isOverlayOpen) return;
        if (focusedGame) onLaunch(focusedGame);
      },
      back: () => {
        if (isOverlayOpen) {
          setAppSettingsOpen(false);
          setGameOptionsGame(null);
          return;
        }
        onExit();
      },
      actionX: () => {
        if (isOverlayOpen) return;
        if (focusedGame) toggleFavorite(focusedGame.id);
      },
      actionY: () => {
        if (isOverlayOpen) return;
        if (focusedGame) {
          setAppSettingsOpen(false);
          setGameOptionsGame(focusedGame);
        }
      },
      prevTab: () => { if (!isOverlayOpen) moveTab(-1); },
      nextTab: () => { if (!isOverlayOpen) moveTab(1); },
      menu: () => {
        if (isOverlayOpen) {
          setAppSettingsOpen(false);
          setGameOptionsGame(null);
        } else {
          setAppSettingsOpen(true);
        }
      }
    },
    !isOverlayOpen,
    100
  );

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

  const backgroundStyle = focusedGame?.coverUrl
    ? { backgroundImage: `url("${focusedGame.coverUrl}")` }
    : { background: 'linear-gradient(135deg, #0b2f0b 0%, #050505 100%)' };

  return (
    <div className="console-mode">
      <div className="console-mode-bg" style={backgroundStyle} />
      <div className="console-mode-overlay" />

      <div className="console-mode-content">
        <div className="console-header">
          <div className="console-brand">
            <div className="console-brand-mark" />
            <div className="console-brand-text">X360</div>
          </div>

          <div className="console-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`console-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFocusedIndex(0);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button type="button" className="console-btn console-btn-secondary" onClick={onExit}>
            <X size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Exit
          </button>
        </div>

        {visibleGames.length === 0 ? (
          <div className="console-empty">
            <h2>No games here yet</h2>
            <p>Add games to your library, then launch Console Mode from the library toolbar.</p>
          </div>
        ) : (
          <>
            <div className="console-shelf-wrap">
              <div className="console-shelf" ref={shelfRef}>
                {visibleGames.map((game, index) => (
                  <div
                    key={game.id}
                    ref={(node) => {
                      tileRefs.current[index] = node;
                    }}
                    className={`console-tile ${index === focusedIndex ? 'focused' : ''}`}
                    onClick={() => setFocusedIndex(index)}
                  >
                    <div className="console-tile-cover">
                      <CoverImage
                        gameName={game.name}
                        coverUrl={game.coverHttpUrl || game.coverUrl}
                        alt={game.name}
                        placeholderSize={48}
                        onCoverFailed={() => handleCoverFailed(game)}
                      />
                    </div>
                    <div className="console-tile-title">{game.name}</div>
                    <div className="console-tile-meta">
                      {game.isFavorite ? 'Favorite' : game.genre || 'Xbox 360'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {focusedGame && (
              <div className="console-details">
                <div className="console-details-main">
                  <h1>{focusedGame.name}</h1>
                  <p>
                    {focusedGame.genre || 'Xbox 360'}
                    {focusedGame.timesPlayed ? ` • Played ${focusedGame.timesPlayed} times` : ''}
                    {focusedGame.isFavorite ? ' • Favorite' : ''}
                  </p>
                </div>

                <div className="console-actions">
                  <button type="button" className="console-btn console-btn-primary" onClick={() => onLaunch(focusedGame)}>
                    <Play size={16} fill="currentColor" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Play
                  </button>
                  <button type="button" className="console-btn console-btn-secondary" onClick={() => onConfigure(focusedGame)}>
                    Options
                  </button>
                </div>
              </div>
            )}

            <div className="console-hints">
              <div className="console-hint"><span className="console-hint-key">A</span> Play</div>
              <div className="console-hint"><span className="console-hint-key">X</span> Favorite</div>
              <div className="console-hint"><span className="console-hint-key">Y</span> Options</div>
              <div className="console-hint"><span className="console-hint-key">B</span> Exit</div>
              <div className="console-hint"><span className="console-hint-key">Start</span> Settings</div>
              <div className="console-hint"><span className="console-hint-key">LB/RB</span> Switch tab</div>
              <div className="console-hint"><span className="console-hint-key">← →</span> Browse games</div>
              {!settings.emulatorPath && (
                <div className="console-hint" style={{ color: '#fbbf24' }}>
                  <Star size={14} /> Set your Xenia path in Settings before launching
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {appSettingsOpen && (
        <MetroSettingsPanel
          mode="app"
          onClose={() => setAppSettingsOpen(false)}
          onSwitchProfile={onSwitchProfile}
          onExitConsole={onExit}
          updateGame={updateGame}
        />
      )}

      {gameOptionsGame && (
        <MetroSettingsPanel
          mode="game"
          game={games.find((g) => g.id === gameOptionsGame.id) || gameOptionsGame}
          onClose={() => setGameOptionsGame(null)}
          onLaunchGame={onLaunch}
          onTogglePin={(g) => toggleFavorite(g.id)}
          updateGame={updateGame}
        />
      )}
    </div>
  );
};

export default ConsoleMode;