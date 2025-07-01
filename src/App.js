import React, { useState, useContext } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GameLibrary from './components/GameLibrary';
import EmulatorSetup from './components/EmulatorSetup';
import GameConfig from './components/GameConfig';
import Settings from './components/Settings';
import Help from './components/Help';
import { GameProvider } from './context/GameContext';
import { SettingsProvider, SettingsContext } from './context/SettingsContext';

const AppContent = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedGame, setSelectedGame] = useState(null);
  const { settings } = useContext(SettingsContext);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveView} />;
      case 'library':
        return <GameLibrary onGameSelect={setSelectedGame} onNavigate={setActiveView} />;
      case 'setup':
        return <EmulatorSetup onNavigate={setActiveView} />;
      case 'config':
        return <GameConfig game={selectedGame} onNavigate={setActiveView} />;
      case 'settings':
        return <Settings />;
      case 'help':
        return <Help />;
      default:
        return <Dashboard onNavigate={setActiveView} />;
    }
  };

  return (
    <div className={`app theme-${settings.theme || 'dark'}`} data-language={settings.language || 'en'}>
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
};

function App() {
  return (
    <SettingsProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </SettingsProvider>
  );
}

export default App;