import React from 'react';
import { Book, ExternalLink, Mail, Github, Coffee, MessageCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const Help = () => {
  const { t } = useTranslation();

  const helpSections = [
    {
      title: 'Getting Started',
      items: [
        'Download and install Xenia emulator from the Setup page',
        'Add your Xbox 360 game files (.iso, .xex) to the library',
        'Configure emulator settings for optimal performance',
        'Launch games directly from the library'
      ]
    },
    {
      title: 'Game Management',
      items: [
        'Scan directories to automatically find games',
        'Add individual games manually',
        'Organize games by genre and favorites',
        'View game details and covers'
      ]
    },
    {
      title: 'Emulator Configuration',
      items: [
        'Set custom resolution and graphics settings',
        'Configure audio and input options',
        'Enable VSync and frame rate limiting',
        'Adjust compatibility settings per game'
      ]
    },
    {
      title: 'Troubleshooting',
      items: [
        'Ensure games are in supported formats (.iso, .xex)',
        'Check emulator path is correctly set',
        'Verify game files are not corrupted',
        'Update graphics drivers for better compatibility'
      ]
    }
  ];

  const externalLinks = [
    {
      title: 'Xenia Official Website',
      url: 'https://xenia.jp/',
      description: 'Download the latest Xenia emulator'
    },
    {
      title: 'Xenia Compatibility List',
      url: 'https://github.com/xenia-project/game-compatibility/issues',
      description: 'Check game compatibility status'
    },
    {
      title: 'Xbox 360 Game Database',
      url: 'https://www.mobygames.com/platform/xbox-360/',
      description: 'Find information about Xbox 360 games'
    }
  ];

  return (
    <div className="help-container">
      <div className="help-header">
        <div className="help-title">
          <Book size={24} />
          <h1>Help & Documentation</h1>
        </div>
        <p className="help-subtitle">
          Everything you need to know about using X360 Manager
        </p>
      </div>

      <div className="help-content">
        <div className="help-sections">
          {helpSections.map((section, index) => (
            <div key={index} className="help-section">
              <h2>{section.title}</h2>
              <ul>
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="help-sidebar">
          <div className="help-card">
            <h3>External Resources</h3>
            <div className="external-links">
              {externalLinks.map((link, index) => (
                <a 
                  key={index}
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  <div className="link-content">
                    <div className="link-title">
                      {link.title}
                      <ExternalLink size={14} />
                    </div>
                    <div className="link-description">{link.description}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="help-card about-card">
            <h3>About X360 Manager</h3>
            <div className="about-content">
              <div className="about-info">
                <p><strong>Version:</strong> 1.1.0</p>
                <p><strong>Developer:</strong> Mohammed Albarghouthi</p>
                <p><strong>License:</strong> MIT</p>
              </div>
              
              <div className="about-description">
                <p>
                  X360 Manager is a modern, user-friendly interface for managing 
                  Xbox 360 games with the Xenia emulator. Built with React and Electron 
                  to provide a seamless gaming experience.
                </p>
              </div>

              <div className="contact-info">
                <h4>Contact & Support</h4>
                <div className="contact-links">
                  <a href="mailto:mohmmad.pod@gmail.com" className="contact-link">
                  <Mail size={16} />
                  <span>Email Support</span>
                </a>
                <a href="https://github.com/Supermedo" target="_blank" rel="noopener noreferrer" className="contact-link">
                  <Github size={16} />
                  <span>GitHub Profile</span>
                </a>
                <a href="https://discord.gg/XWNVcxATb3" target="_blank" rel="noopener noreferrer" className="contact-link">
                  <MessageCircle size={16} />
                  <span>Discord Community</span>
                </a>
                </div>
              </div>

              <div className="support-section">
                <h4>Support Development</h4>
                <p className="support-text">
                  If you find X360 Manager helpful, consider supporting the development!
                </p>
                <a href="https://ko-fi.com/mohammedalbarthouthi" target="_blank" rel="noopener noreferrer" className="support-link">
                  <Coffee size={16} />
                  <span>Buy me a coffee</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;