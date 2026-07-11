import React, { useState, useContext, useCallback, useEffect } from 'react';

import './App.css';
import './components/BootScreens.css';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GameLibrary from './components/GameLibrary';
import EmulatorSetup from './components/EmulatorSetup';
import GameConfig from './components/GameConfig';
import Settings from './components/Settings';
import Help from './components/Help';
import TitleBar from './components/TitleBar';
import UpdateNotifier from './components/UpdateNotifier';
import ConsoleMode from './components/ConsoleMode';
import ConsoleErrorBoundary from './components/ConsoleErrorBoundary';
import MetroDashboard from './components/metro/MetroDashboard';
import ConsoleBootSequence from './components/metro/ConsoleBootSequence';
import OnboardingWizard from './components/OnboardingWizard';
import ProfilePicker from './components/ProfilePicker';

import { GameProvider, GameContext } from './context/GameContext';
import { SettingsProvider, SettingsContext } from './context/SettingsContext';
import { GameplayProvider, useGameplay } from './context/GameplayContext';

import useGamepad from './hooks/useGamepad';
import useAppFullscreen from './hooks/useAppFullscreen';
import useTranslation from './hooks/useTranslation';
import { buildGameLaunchConfig } from './services/launchConfig';
import { isRtlLanguage } from './constants/appLanguages';

const APP_VIEWS = ['library', 'setup', 'settings', 'help'];

const AppContent = () => {
  const [activeView, setActiveView] = useState('library');
  const [selectedGame, setSelectedGame] = useState(null);
  const [consoleMode, setConsoleMode] = useState(false);
  const [consoleBooting, setConsoleBooting] = useState(false);
  const [bootPhase, setBootPhase] = useState('loading');
  const [profileOverlay, setProfileOverlay] = useState(false);

  const { settings, updateSettings, hydrated } = useContext(SettingsContext);
  const { updateGame } = useContext(GameContext);
  const { emulatorRunning } = useGameplay();
  const { toggleFullscreen, setFullscreen, isFullscreen } = useAppFullscreen();
  const { t } = useTranslation();

  useEffect(() => {
    const lang = settings.language || 'en';
    const rtl = isRtlLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }, [settings.language]);

  useEffect(() => {
    if (!hydrated) return undefined;

    let cancelled = false;

    const runBoot = async () => {
      const needsSetup = !settings.onboardingCompleted;
      if (needsSetup) {
        setBootPhase('onboarding');
        return;
      }

      if (!window.electronAPI?.listXboxLiveProfiles) {
        setBootPhase('ready');
        return;
      }

      const result = await window.electronAPI.listXboxLiveProfiles(settings.emulatorPath);
      if (cancelled) return;

      const profiles = result?.profiles || [];

      if (profiles.length > 1 && settings.askProfileOnLaunch !== false) {
        setBootPhase('profile');
        return;
      }

      if (profiles.length === 1) {
        const only = profiles[0];
        updateSettings({
          activeXboxLiveProfileId: only.id,
          sessionXboxLiveProfileId: only.id,
          sessionGamertag: only.gamertag || 'User',
          sessionAvatar: only.avatar || null
        });
        await window.electronAPI.saveXboxLiveProfile?.(settings.emulatorPath, only, true);
      }

      setBootPhase('ready');
    };

    runBoot();
    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    settings.onboardingCompleted,
    settings.emulatorPath,
    settings.askProfileOnLaunch
  ]);

  const cycleView = useCallback((direction) => {
    setActiveView((current) => {
      const idx = APP_VIEWS.indexOf(current);
      if (idx === -1) return 'library';
      return APP_VIEWS[(idx + direction + APP_VIEWS.length) % APP_VIEWS.length];
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'F11') {
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [toggleFullscreen]);

  useGamepad(
    {
      back: () => {
        if (activeView === 'config') {
          setActiveView('library');
          return;
        }
        if (activeView !== 'library') {
          setActiveView('library');
        }
      },
      prevTab: () => {
        if (activeView === 'library') return;
        cycleView(-1);
      },
      nextTab: () => {
        if (activeView === 'library') return;
        cycleView(1);
      },
      menu: () => toggleFullscreen()
    },
    bootPhase === 'ready' && !consoleMode,
    1
  );

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

  const enterConsoleMode = useCallback(() => {
    setConsoleBooting(true);
    setConsoleMode(true);
  }, []);

  const exitConsoleMode = useCallback(() => {
    window.electronAPI?.setFullScreen?.(false);
    setConsoleBooting(false);
    setConsoleMode(false);
  }, []);

  const handleConfigureGame = useCallback((game) => {
    setSelectedGame(game);
    setActiveView('config');
    setConsoleMode(false);
    setConsoleBooting(false);
  }, []);

  const handleProfileSelected = useCallback(() => {
    setBootPhase('ready');
    setProfileOverlay(false);
  }, []);

  const handleSwitchProfile = useCallback(() => {
    setProfileOverlay(true);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveView} />;
      case 'library':
        return (
          <GameLibrary
            onGameSelect={setSelectedGame}
            onNavigate={setActiveView}
            onEnterConsoleMode={enterConsoleMode}
            suspendGamepad={consoleMode}
          />
        );
      case 'setup':
        return <EmulatorSetup onNavigate={setActiveView} />;
      case 'config':
        return <GameConfig game={selectedGame} onNavigate={setActiveView} />;
      case 'settings':
        return <Settings onSwitchProfile={handleSwitchProfile} />;
      case 'help':
        return <Help />;
      default:
        return (
          <GameLibrary
            onGameSelect={setSelectedGame}
            onNavigate={setActiveView}
            onEnterConsoleMode={enterConsoleMode}
            suspendGamepad={consoleMode}
          />
        );
    }
  };

  if (bootPhase === 'loading') {
    return (
      <div className="boot-screen">
        <div className="loading-spinner" style={{ width: 40, height: 40, border: '3px solid rgba(16,124,16,0.3)', borderTopColor: '#107c10', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (bootPhase === 'onboarding') {
    return (
      <OnboardingWizard
        onComplete={async () => {
          const emu = settings.emulatorPath;
          if (!emu || !window.electronAPI?.listXboxLiveProfiles) {
            setBootPhase('ready');
            return;
          }
          const result = await window.electronAPI.listXboxLiveProfiles(emu);
          const profiles = result?.profiles || [];
          if (profiles.length > 1) {
            setBootPhase('profile');
          } else {
            setBootPhase('ready');
          }
        }}
      />
    );
  }

  if (bootPhase === 'profile') {
    return (
      <ProfilePicker onSelect={handleProfileSelected} />
    );
  }

  if (profileOverlay && !consoleMode) {
    return (
      <ProfilePicker
        onSelect={handleProfileSelected}
        onCancel={() => setProfileOverlay(false)}
        allowAdd
      />
    );
  }

  return (
    <>
      {!consoleMode && <TitleBar />}
      {!consoleMode && <UpdateNotifier checkOnMount={false} />}
      <div className={`app theme-${settings.theme || 'dark'} ${consoleMode ? 'console-mode-active' : ''}`} data-language={settings.language || 'en'}>
        {!consoleMode && (
          <Sidebar
            activeView={activeView}
            onNavigate={setActiveView}
            onSwitchProfile={handleSwitchProfile}
            sessionGamertag={settings.sessionGamertag}
            sessionAvatar={settings.sessionAvatar}
          />
        )}
        <main className="main-content" style={consoleMode ? { display: 'none' } : undefined}>
          {renderView()}
        </main>
      </div>

      {!consoleMode && activeView === 'library' && !emulatorRunning && (
        <div className={`controller-hint-bar${isFullscreen ? ' controller-hint-bar--fullscreen' : ''}`} aria-hidden="true">
          <span><kbd>A</kbd> {t('hintPlay')}</span>
          <span><kbd>X</kbd> {t('hintFavorite')}</span>
          <span><kbd>Y</kbd> {t('hintSettings')}</span>
          <span><kbd>Select</kbd> {t('hintMenu')}</span>
          <span><kbd>↑↓</kbd> {t('hintBrowse')}</span>
          <span><kbd>Start</kbd> {t('hintFullscreen')}</span>
        </div>
      )}

      {consoleMode && consoleBooting && (
        <ConsoleBootSequence
          onComplete={() => setConsoleBooting(false)}
          onCancel={exitConsoleMode}
        />
      )}

      {consoleMode && !consoleBooting && (
        <ConsoleErrorBoundary onExit={exitConsoleMode}>
          {settings.betaMetroConsole ? (
            <MetroDashboard
              onExit={exitConsoleMode}
              onLaunch={handleLaunchGame}
              onConfigure={handleConfigureGame}
              onSwitchProfile={handleSwitchProfile}
            />
          ) : (
            <ConsoleMode
              onExit={exitConsoleMode}
              onLaunch={handleLaunchGame}
              onConfigure={handleConfigureGame}
              onSwitchProfile={handleSwitchProfile}
            />
          )}
        </ConsoleErrorBoundary>
      )}

      {profileOverlay && consoleMode && !consoleBooting && (
        <div className="console-profile-overlay">
          <ProfilePicker
            onSelect={handleProfileSelected}
            onCancel={() => setProfileOverlay(false)}
            allowAdd
          />
        </div>
      )}
    </>
  );
};

function App() {
  return (
    <SettingsProvider>
      <GameProvider>
        <GameplayProvider>
          <AppContent />
        </GameplayProvider>
      </GameProvider>
    </SettingsProvider>
  );
}

export default App;
