import React, { useState, useEffect, useContext } from 'react';
import {
  Play,
  Download,
  Settings,
  Library,
  Zap,
  HardDrive,
  Gamepad2,
  Clock,
  Heart,
  X
} from 'lucide-react';
import CoverImage from './CoverImage';
import { fetchGameCoverDetails } from '../services/coverService';
import { GameContext } from '../context/GameContext';
import { SettingsContext } from '../context/SettingsContext';
import { buildGameLaunchConfig } from '../services/launchConfig';
import useTranslation from '../hooks/useTranslation';

const Dashboard = ({ onNavigate }) => {
  const { games, recentGames } = useContext(GameContext);
  const { settings } = useContext(SettingsContext);
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalGames: 0,
    recentlyPlayed: 0,
    emulatorStatusKey: 'statusNotConfigured'
  });

  useEffect(() => {
    setStats({
      totalGames: games.length,
      recentlyPlayed: recentGames.length,
      emulatorStatusKey: settings.emulatorPath ? 'statusReady' : 'statusNotConfigured'
    });
  }, [games, recentGames, settings]);

  const quickActions = [
    {
      title: t('setupEmulator'),
      description: t('setupEmulatorDesc'),
      icon: Download,
      action: () => onNavigate('setup'),
      color: '#7bbf32',
      disabled: false
    },
    {
      title: t('addGames'),
      description: t('addGamesDesc'),
      icon: Library,
      action: () => onNavigate('library'),
      color: '#3b82f6',
      disabled: !settings.emulatorPath
    },
    {
      title: t('gameConfig'),
      description: t('gameConfigDesc'),
      icon: Settings,
      action: () => onNavigate('config'),
      color: '#10b981',
      disabled: games.length === 0
    }
  ];

  const StatCard = ({ title, value, icon: Icon, statusKey }) => (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <Icon size={24} />
            {title}
          </h3>
        </div>
        {statusKey && (
          <span className={`status status-${statusKey === 'statusReady' ? 'success' : 'warning'}`}>
            {t(statusKey)}
          </span>
        )}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7bbf32' }}>
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
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        {description}
      </p>
    </div>
  );

  const RecentGameCard = ({ game }) => {
    const { updateGame, removeGame, xbox360DB } = useContext(GameContext);
    const { settings } = useContext(SettingsContext);
    const [coverFetched, setCoverFetched] = React.useState(!!game.coverUrl);

    React.useEffect(() => {
      const fetchCover = async () => {
        if (!game.coverUrl && !coverFetched && xbox360DB && xbox360DB.length > 0) {
          try {
            const filename = game.path ? game.path.split(/[\\/]/).pop() : game.name;
            const details = await fetchGameCoverDetails(filename, game.titleId, xbox360DB);
            if (details?.coverUrl) {
              updateGame(game.id, {
                coverUrl: details.coverUrl,
                description: details.description || game.description,
                genre: details.genre || game.genre
              });
            }
            setCoverFetched(true);
          } catch (error) {
            console.error('Error fetching dashboard cover:', error);
            setCoverFetched(true);
          }
        }
      };

      fetchCover();
    }, [game.id, game.name, game.path, game.titleId, game.coverUrl, game.description, game.genre, coverFetched, xbox360DB, updateGame]);



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

        await window.electronAPI.launchGame(
          settings.emulatorPath,
          game.path,
          buildGameLaunchConfig(game, settings)
        );

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
          <CoverImage
            gameName={game.name}
            coverUrl={game.coverHttpUrl || game.coverUrl}
            alt={game.name}
            style={{ borderRadius: '8px' }}
            placeholderSize={32}
          />
        </div>
        <div className="game-info">
          <div className="game-title">{game.name}</div>
          <div className="game-meta">
            <Clock size={12} style={{ marginRight: '4px' }} />
            {t('lastPlayed')} {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : t('never')}
          </div>
          <div className="game-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handlePlayGame}
              style={{ flex: 1 }}
            >
              <Play size={14} style={{ marginRight: '4px' }} />
              {t('play')}
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
          background: 'linear-gradient(180deg, #7bbf32, #107c10)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t('dashboardWelcomeTitle')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
          {t('dashboardWelcomeSubtitle')}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-3" style={{ marginBottom: '32px' }}>
        <StatCard
          title={t('totalGames')}
          value={stats.totalGames}
          icon={Library}
        />
        <StatCard
          title={t('recentlyPlayed')}
          value={stats.recentlyPlayed}
          icon={Clock}
        />
        <StatCard
          title={t('emulatorStatus')}
          value={t(stats.emulatorStatusKey)}
          icon={Zap}
          statusKey={stats.emulatorStatusKey}
        />
      </div>

      <div className="grid grid-2">
        {/* Quick Actions */}
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '24px',
            color: 'var(--text-primary)'
          }}>
            {t('quickActions')}
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
            color: 'var(--text-primary)'
          }}>
            {t('recentGames')}
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
                  {t('viewAllGames')}
                </button>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Gamepad2 size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>{t('noRecentGames')}</h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginBottom: '24px' }}>
                {t('noRecentGamesHint')}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => onNavigate('library')}
              >
                <Library size={16} />
                {t('goToLibrary')}
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
            {t('systemStatus')}
          </h3>
        </div>
        <div className="grid grid-3">
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
              {t('emulatorPath')}
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '500' }}>
              {settings.emulatorPath || t('notConfigured')}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
              {t('gamesDirectory')}
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '500' }}>
              {settings.gamesDirectory || t('notSet')}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
              {t('rendererGpuApi')}
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '500' }}>
              {settings.defaultRenderer || t('auto')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;