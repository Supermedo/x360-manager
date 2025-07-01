import React, { useState, useEffect, useContext } from 'react';
import { 
  Play, 
  Download, 
  Settings, 
  Library, 
  Zap, 
  HardDrive,
  Gamepad2,
  TrendingUp,
  Clock,
  Star,
  Heart,
  X
} from 'lucide-react';
import { GameContext } from '../context/GameContext';
import { SettingsContext } from '../context/SettingsContext';

const Dashboard = ({ onNavigate }) => {
  const { games, recentGames } = useContext(GameContext);
  const { settings } = useContext(SettingsContext);
  const [stats, setStats] = useState({
    totalGames: 0,
    recentlyPlayed: 0,
    emulatorStatus: 'Not Configured'
  });

  useEffect(() => {
    setStats({
      totalGames: games.length,
      recentlyPlayed: recentGames.length,
      emulatorStatus: settings.emulatorPath ? 'Ready' : 'Not Configured'
    });
  }, [games, recentGames, settings]);

  const quickActions = [
    {
      title: 'Setup Emulator',
      description: 'Download and configure Xenia emulator',
      icon: Download,
      action: () => onNavigate('setup'),
      color: '#8b5cf6',
      disabled: false
    },
    {
      title: 'Add Games',
      description: 'Import games to your library',
      icon: Library,
      action: () => onNavigate('library'),
      color: '#3b82f6',
      disabled: !settings.emulatorPath
    },
    {
      title: 'Game Config',
      description: 'Configure game settings',
      icon: Settings,
      action: () => onNavigate('config'),
      color: '#10b981',
      disabled: games.length === 0
    }
  ];

  const StatCard = ({ title, value, icon: Icon, status }) => (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <Icon size={24} />
            {title}
          </h3>
        </div>
        {status && (
          <span className={`status status-${status === 'Ready' ? 'success' : 'warning'}`}>
            {status}
          </span>
        )}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
        {value}
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon: Icon, action, color, disabled }) => (
    <div 
      className={`card ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
      onClick={disabled ? undefined : action}
      style={{ 
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      <div className="card-header">
        <div style={{ 
          width: '48px', 
          height: '48px', 
          background: `linear-gradient(135deg, ${color}, ${color}88)`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <Icon size={24} color="white" />
        </div>
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#e2e8f0' }}>
        {title}
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '14px' }}>
        {description}
      </p>
    </div>
  );

  const RecentGameCard = ({ game }) => {
    const { updateGame, removeGame } = useContext(GameContext);
    const { settings } = useContext(SettingsContext);
    const [coverFetched, setCoverFetched] = React.useState(!!game.coverUrl);

    // Auto-fetch cover if missing
    React.useEffect(() => {
      const fetchCover = async () => {
        if (!game.coverUrl && !coverFetched) {
          setCoverFetched(true);
          try {
            const rawgApiKey = localStorage.getItem('rawgApiKey') || 'e0dbb76130754c98a1e7648bbe45103d';
            const response = await fetch(`https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(game.name)}&page_size=1`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              const coverUrl = data.results[0].background_image;
              if (coverUrl) {
                updateGame(game.id, { coverUrl });
              }
            }
          } catch (error) {
            console.error('Error fetching cover for recent game:', error);
          }
        }
      };
      
      fetchCover();
    }, [game.id, game.name, game.coverUrl, coverFetched, updateGame]);



    const handlePlayGame = async () => {
      try {
        if (!settings.emulatorPath) {
          window.electronAPI?.showMessageBox({
            type: 'error',
            title: 'Emulator Not Configured',
            message: 'Please configure your emulator path in Settings before playing games.',
            buttons: ['OK']
          });
          return;
        }

        if (!game.path) {
          window.electronAPI?.showMessageBox({
            type: 'error',
            title: 'Game Path Missing',
            message: 'This game does not have a valid file path configured.',
            buttons: ['OK']
          });
          return;
        }

        await window.electronAPI.launchGame(settings.emulatorPath, game.path, game.config || {});
        
        // Update game statistics
        updateGame(game.id, {
          timesPlayed: (game.timesPlayed || 0) + 1,
          lastPlayed: new Date().toISOString()
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

    const handleToggleFavorite = () => {
      updateGame(game.id, {
        isFavorite: !game.isFavorite
      });
    };

    const handleRemoveGame = () => {
      if (window.confirm(`Are you sure you want to remove "${game.name}" from your library?`)) {
        removeGame(game.id);
      }
    };

    return (
      <div className="game-card" style={{ marginBottom: '16px' }}>
        <div className="game-cover" style={{ height: '120px' }}>
          {game.coverUrl ? (
            <img 
              src={game.coverUrl} 
              alt={game.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            style={{ 
              display: game.coverUrl ? 'none' : 'flex',
              width: '100%', 
              height: '100%', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px'
            }}
          >
            <Gamepad2 size={32} />
          </div>
        </div>
        <div className="game-info">
          <div className="game-title">{game.name}</div>
          <div className="game-meta">
            <Clock size={12} style={{ marginRight: '4px' }} />
            Last played: {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : 'Never'}
          </div>
          <div className="game-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button 
              className="btn btn-primary btn-sm"
              onClick={handlePlayGame}
              style={{ flex: 1 }}
            >
              <Play size={14} style={{ marginRight: '4px' }} />
              Play
            </button>
            <button 
              className={`btn btn-sm ${game.isFavorite ? 'btn-warning' : 'btn-secondary'}`}
              onClick={handleToggleFavorite}
              title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={14} fill={game.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button 
              className="btn btn-danger btn-sm"
              onClick={handleRemoveGame}
              title="Remove from library"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

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
          Welcome to X360 Manager
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>
          Your complete emulation management solution
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-3" style={{ marginBottom: '32px' }}>
        <StatCard 
          title="Total Games" 
          value={stats.totalGames} 
          icon={Library}
        />
        <StatCard 
          title="Recently Played" 
          value={stats.recentlyPlayed} 
          icon={Clock}
        />
        <StatCard 
          title="Emulator Status" 
          value={stats.emulatorStatus} 
          icon={Zap}
          status={stats.emulatorStatus}
        />
      </div>

      <div className="grid grid-2">
        {/* Quick Actions */}
        <div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            marginBottom: '24px',
            color: '#e2e8f0'
          }}>
            Quick Actions
          </h2>
          <div className="grid" style={{ gap: '16px' }}>
            {quickActions.map((action, index) => (
              <QuickActionCard key={index} {...action} />
            ))}
          </div>
        </div>

        {/* Recent Games */}
        <div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            marginBottom: '24px',
            color: '#e2e8f0'
          }}>
            Recent Games
          </h2>
          {recentGames.length > 0 ? (
            <div>
              {recentGames.slice(0, 3).map((game, index) => (
                <RecentGameCard key={index} game={game} />
              ))}
              {recentGames.length > 3 && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => onNavigate('library')}
                  style={{ width: '100%', marginTop: '16px' }}
                >
                  View All Games
                </button>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Gamepad2 size={48} style={{ color: '#64748b', marginBottom: '16px' }} />
              <h3 style={{ color: '#94a3b8', marginBottom: '8px' }}>No Recent Games</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                Add games to your library to see them here
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => onNavigate('library')}
              >
                <Library size={16} />
                Go to Library
              </button>
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="card" style={{ marginTop: '32px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <HardDrive size={24} />
            System Status
          </h3>
        </div>
        <div className="grid grid-3">
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
              Emulator Path
            </div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>
              {settings.emulatorPath || 'Not configured'}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
              Games Directory
            </div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>
              {settings.gamesDirectory || 'Not set'}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
              Default Renderer
            </div>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500' }}>
              {settings.defaultRenderer || 'Auto'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;