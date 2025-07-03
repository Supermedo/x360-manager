import React from 'react';
import { 
  Home, 
  Library, 
  Download, 
  Settings, 
  Gamepad2,
  Zap,
  HelpCircle
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const Sidebar = ({ activeView, onNavigate }) => {
  const { t } = useTranslation();
  
  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: Home },
    { id: 'library', label: t('library'), icon: Library },
    { id: 'setup', label: t('setup'), icon: Download },
    { id: 'config', label: 'Game Config', icon: Gamepad2 },
    { id: 'settings', label: t('settings'), icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <Zap size={20} />
          </div>
          <span>X360 Manager</span>
        </div>
      </div>
      
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
      
      <div style={{ padding: '0 24px', marginTop: 'auto' }}>
        <div style={{ 
          padding: '16px', 
          background: 'rgba(139, 92, 246, 0.1)', 
          borderRadius: '12px',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            Version 1.1.0
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