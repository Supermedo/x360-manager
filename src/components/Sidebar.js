import React, { useEffect, useState } from 'react';
import {
  Library,
  Download,
  Settings,
  HelpCircle,
  Users
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import ProfileAvatar from './ProfileAvatar';

const Sidebar = ({ activeView, onNavigate, onSwitchProfile, sessionGamertag, sessionAvatar }) => {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then((v) => {
      if (v) setAppVersion(v);
    });
  }, []);

  const navItems = [
    { id: 'library', label: t('library'), icon: Library },
    { id: 'setup', label: t('setup'), icon: Download },
    { id: 'settings', label: t('settings'), icon: Settings },
    { id: 'help', label: t('help'), icon: HelpCircle }
  ];

  return (
    <div className="sidebar">
      <nav className="nav-menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div style={{ padding: '0 16px 16px' }}>
        {sessionGamertag && (
          <button
            type="button"
            className="sidebar-profile-switch"
            onClick={onSwitchProfile}
            title={t('switchProfile')}
          >
            <span className="sidebar-profile-switch__avatar">
              <ProfileAvatar
                avatar={sessionAvatar}
                size={36}
                fallbackInitials={sessionGamertag.slice(0, 2).toUpperCase()}
              />
            </span>
            <span className="sidebar-profile-switch__meta">
              <span className="sidebar-profile-switch__label">{t('signedIn')}</span>
              <span className="sidebar-profile-switch__tag">{sessionGamertag}</span>
            </span>
            <Users size={16} className="sidebar-profile-switch__icon" />
          </button>
        )}
      </div>

      <div style={{ padding: '0 24px', marginTop: 'auto' }}>
        <div style={{
          padding: '16px',
          background: 'rgba(16, 124, 16, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(16, 124, 16, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            Version {appVersion || '…'}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>
            X360 Manager
          </div>
          <div style={{ fontSize: '9px', color: '#64748b', fontStyle: 'italic' }}>
            Made by Mohammed Albarghouthi
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
