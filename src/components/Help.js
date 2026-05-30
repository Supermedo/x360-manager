import React from 'react';
import { Book, ExternalLink, Mail, Github, Coffee, MessageCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const Help = () => {
  const { t } = useTranslation();

  const helpSections = [
    {
      title: t('helpGettingStarted'),
      items: [t('helpGs1'), t('helpGs2'), t('helpGs3'), t('helpGs4')]
    },
    {
      title: t('helpGameManagement'),
      items: [t('helpGm1'), t('helpGm2'), t('helpGm3'), t('helpGm4')]
    },
    {
      title: t('helpEmulatorConfiguration'),
      items: [t('helpEc1'), t('helpEc2'), t('helpEc3'), t('helpEc4')]
    },
    {
      title: t('helpTroubleshooting'),
      items: [t('helpTs1'), t('helpTs2'), t('helpTs3'), t('helpTs4')]
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
          <h1>{t('helpTitle')}</h1>
        </div>
        <p className="help-subtitle">
          {t('helpSubtitle')}
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
            <h3>{t('externalResources')}</h3>
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
            <h3>{t('aboutX360Manager')}</h3>
            <div className="about-content">
              <div className="about-info">
                <p><strong>{t('version')}:</strong> 1.5.0</p>
                <p><strong>{t('developer')}:</strong> Mohammed Albarghouthi</p>
                <p><strong>{t('license')}:</strong> MIT</p>
              </div>

              <div className="about-description">
                <p>
                  X360 Manager is a modern, user-friendly interface for managing
                  Xbox 360 games with the Xenia emulator. Built with React and Electron
                  to provide a seamless gaming experience.
                </p>
              </div>

              <div className="contact-info">
                <h4>{t('contactSupport')}</h4>
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