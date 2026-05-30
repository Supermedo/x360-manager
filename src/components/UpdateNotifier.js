import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import useTranslation from '../hooks/useTranslation';

const RELEASES_URL = 'https://github.com/Supermedo/x360-manager/releases';

const UpdateNotifier = ({ checkOnMount = true }) => {
  const { t } = useTranslation();
  const [currentVersion, setCurrentVersion] = useState('');
  const [status, setStatus] = useState('idle');
  const [availableVersion, setAvailableVersion] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    window.electronAPI?.getAppVersion?.().then((v) => {
      if (!cancelled && v) setCurrentVersion(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return undefined;

    const unsubscribe = window.electronAPI.onUpdateStatus((payload) => {
      if (!payload) return;
      if (payload.currentVersion) setCurrentVersion(payload.currentVersion);
      if (payload.status === 'disabled') {
        setStatus('disabled');
        return;
      }
      if (payload.status === 'checking') {
        setStatus('checking');
        setError('');
        return;
      }
      if (payload.status === 'available') {
        setStatus('available');
        setAvailableVersion(payload.version || '');
        setDismissed(false);
        return;
      }
      if (payload.status === 'not-available') {
        setStatus('idle');
        return;
      }
      if (payload.status === 'downloading') {
        setStatus('downloading');
        setDownloadPercent(payload.percent || 0);
        return;
      }
      if (payload.status === 'downloaded') {
        setStatus('downloaded');
        setAvailableVersion(payload.version || availableVersion);
        return;
      }
      if (payload.status === 'error') {
        setError(payload.error || 'Update check failed');
        setStatus('error');
      }
    });

    return unsubscribe;
  }, [availableVersion]);

  useEffect(() => {
    if (!checkOnMount || !window.electronAPI?.checkForUpdates) return undefined;
    const timer = setTimeout(() => {
      window.electronAPI.checkForUpdates().catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [checkOnMount]);

  const handleCheck = useCallback(async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setBusy(true);
    setError('');
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result?.disabled) {
        setStatus('disabled');
        return;
      }
      if (result?.ok && !result.updateInfo) {
        window.electronAPI.showMessageBox?.({
          type: 'info',
          title: 'Up to date',
          message: `You are on the latest version (v${currentVersion || result.currentVersion || '?' }).`
        });
      }
    } finally {
      setBusy(false);
    }
  }, [currentVersion]);

  const handleDownload = useCallback(async () => {
    if (!window.electronAPI?.downloadAppUpdate) {
      window.electronAPI?.openExternal?.(RELEASES_URL);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await window.electronAPI.downloadAppUpdate();
      if (!result?.ok) {
        setError(result?.error || 'Download failed');
        window.electronAPI?.openExternal?.(RELEASES_URL);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const handleInstall = useCallback(() => {
    window.electronAPI?.installAppUpdate?.();
  }, []);

  const showBanner = status !== 'disabled'
    && window.electronAPI?.getAppVersion
    && !dismissed
    && (status === 'available' || status === 'downloading' || status === 'downloaded');

  useEffect(() => {
    document.body.classList.toggle('has-update-banner', Boolean(showBanner));
    return () => document.body.classList.remove('has-update-banner');
  }, [showBanner]);

  if (status === 'disabled' || !window.electronAPI?.getAppVersion) {
    return null;
  }

  if (!showBanner) {
    return null;
  }

  return (
    <div className="update-notifier" role="status">
      <div className="update-notifier__content">
        {status === 'available' && (
          <>
            <strong>{t('updateAvailable')}</strong>
            <span>
              v{currentVersion} → v{availableVersion}
            </span>
          </>
        )}
        {status === 'downloading' && (
          <>
            <strong>{t('downloading')}</strong>
            <span>{downloadPercent}%</span>
          </>
        )}
        {status === 'downloaded' && (
          <>
            <strong>{t('updateReady')}</strong>
            <span>v{availableVersion} {t('updateReadyHint')}</span>
          </>
        )}
      </div>
      <div className="update-notifier__actions">
        {status === 'available' && (
          <button type="button" className="btn btn-primary btn-sm" onClick={handleDownload} disabled={busy}>
            <Download size={14} />
            {t('download')}
          </button>
        )}
        {status === 'downloaded' && (
          <button type="button" className="btn btn-primary btn-sm" onClick={handleInstall}>
            {t('restartAndInstall')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => window.electronAPI?.openExternal?.(RELEASES_URL)}
        >
          {t('releaseNotes')}
        </button>
        {status === 'available' && (
          <button type="button" className="update-notifier__dismiss" onClick={() => setDismissed(true)} title={t('dismiss')}>
            <X size={16} />
          </button>
        )}
      </div>
      {error && <p className="update-notifier__error">{error}</p>}
    </div>
  );
};

export default UpdateNotifier;

export const AppVersionSettings = () => {
  const { t } = useTranslation();
  const [currentVersion, setCurrentVersion] = useState('.');
  const [updateStatus, setUpdateStatus] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then((v) => setCurrentVersion(v || '?'));
    if (!window.electronAPI?.onUpdateStatus) return undefined;
    return window.electronAPI.onUpdateStatus((payload) => {
      if (payload?.currentVersion) setCurrentVersion(payload.currentVersion);
      if (payload?.status === 'available') {
        setUpdateStatus(`v${payload.version} is available`);
      } else if (payload?.status === 'downloaded') {
        setUpdateStatus(`v${payload.version} ready to install`);
      } else if (payload?.status === 'not-available') {
        setUpdateStatus(t('onLatestRelease'));
      } else if (payload?.status === 'error') {
        setUpdateStatus(payload.error || 'Could not check for updates');
      }
    });
  }, [t]);

  const handleCheck = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      window.electronAPI?.openExternal?.(RELEASES_URL);
      return;
    }
    setChecking(true);
    try {
      await window.electronAPI.checkForUpdates();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="settings-section" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <h3 className="section-title">{t('appUpdatesTitle')}</h3>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
        {t('installedVersion')}: <strong style={{ color: '#e2e8f0' }}>v{currentVersion}</strong>
      </p>
      {updateStatus && (
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '12px' }}>{updateStatus}</p>
      )}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" onClick={handleCheck} disabled={checking}>
          <RefreshCw size={16} className={checking ? 'spin' : ''} />
          {checking ? t('checking') : t('checkForUpdates')}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => window.electronAPI?.openExternal?.(RELEASES_URL)}
        >
          {t('viewReleasesOnGitHub')}
        </button>
      </div>
    </div>
  );
};
