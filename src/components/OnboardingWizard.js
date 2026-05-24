import React, { useContext, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FolderOpen, Gamepad2, Sparkles } from 'lucide-react';
import { SettingsContext } from '../context/SettingsContext';
import { GameContext } from '../context/GameContext';
import AvatarBuilder from './AvatarBuilder';
import ProfileAvatar from './ProfileAvatar';
import { DEFAULT_AVATAR_CONFIG, randomAvatarConfig } from '../utils/avatarOptions';

const STEPS = ['welcome', 'emulator', 'games', 'profile'];

const EMULATOR_VERSIONS = [
  {
    id: 'stable',
    name: 'Xenia Stable',
    description: 'Stable release, broad compatibility.',
    url: 'https://github.com/xenia-project/release-builds-windows/releases/latest/download/xenia_master.zip'
  },
  {
    id: 'canary',
    name: 'Xenia Canary',
    description: 'Profiles, patches, latest fixes (recommended).',
    url: 'https://github.com/xenia-canary/xenia-canary-releases/releases/latest/download/xenia_canary_windows.zip'
  },
  {
    id: 'netplay',
    name: 'Xenia Netplay',
    description: 'Build with netplay for online play where supported.',
    url: 'https://github.com/xenia-project/release-builds-windows/releases/latest/download/xenia_master.zip'
  }
];

const OnboardingWizard = ({ onComplete }) => {
  const { updateSettings } = useContext(SettingsContext);
  const { scanGamesDirectory, updateGame } = useContext(GameContext);
  const [stepIndex, setStepIndex] = useState(0);
  const [emulatorPath, setEmulatorPath] = useState('');
  const [gamesDirectory, setGamesDirectory] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [avatar, setAvatar] = useState({ type: 'builder', config: { ...DEFAULT_AVATAR_CONFIG } });
  const [showAvatarBuilder, setShowAvatarBuilder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadLabel, setDownloadLabel] = useState('');
  const [downloadVersionId, setDownloadVersionId] = useState('canary');

  useEffect(() => {
    if (!window.electronAPI?.onDownloadProgress) return undefined;
    const handler = (p) => setDownloadProgress(typeof p === 'number' ? p : 0);
    window.electronAPI.onDownloadProgress(handler);
    return () => window.electronAPI?.removeDownloadProgressListener?.();
  }, []);

  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goBack = () => {
    setError('');
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const pickEmulator = async () => {
    setError('');
    const path = await window.electronAPI?.selectEmulatorPath?.();
    if (!path) return;
    const validation = await window.electronAPI?.validateEmulator?.(path);
    if (!validation?.valid) {
      setError(validation?.error || 'That file does not look like Xenia.');
      return;
    }
    setEmulatorPath(path);
  };

  const selectedVersion = EMULATOR_VERSIONS.find((v) => v.id === downloadVersionId) || EMULATOR_VERSIONS[1];

  const downloadSelectedVersion = async () => {
    if (!window.electronAPI?.downloadEmulator) {
      setError('Download is only available in the desktop app.');
      return;
    }
    setError('');
    setDownloadLabel('');
    const downloadDir = await window.electronAPI.selectDirectory();
    if (!downloadDir) return;

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadLabel(`Downloading ${selectedVersion.name}…`);

    try {
      const result = await window.electronAPI.downloadEmulator(selectedVersion.url, downloadDir);
      if (result?.success && result.path) {
        setEmulatorPath(result.path);
        setDownloadProgress(100);
        setDownloadLabel('Done. You can continue.');
      } else {
        setError(result?.error || 'Download or extract failed.');
      }
    } catch (err) {
      setError(err.message || 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const pickGamesDir = async () => {
    const path = await window.electronAPI?.selectDirectory?.();
    if (path) setGamesDirectory(path);
  };

  const finish = async () => {
    if (!emulatorPath) {
      setError('Choose your Xenia executable first.');
      setStepIndex(1);
      return;
    }

    setBusy(true);
    setError('');

    try {
      const tag = (gamertag || 'Player').trim().slice(0, 15) || 'Player';
      if (usePin) {
        if (pin.length < 4) {
          setError('PIN must be at least 4 characters.');
          setBusy(false);
          return;
        }
        if (pin !== confirmPin) {
          setError('PINs do not match.');
          setBusy(false);
          return;
        }
      }

      updateSettings({
        emulatorPath,
        gamesDirectory,
        setupCompleted: true,
        onboardingCompleted: true
      });

      const profileResult = await window.electronAPI?.createXboxLiveProfile?.(emulatorPath, {
        gamertag: tag,
        pin: usePin ? pin : undefined,
        avatar
      });

      if (profileResult?.ok && profileResult.activeProfileId) {
        updateSettings({
          activeXboxLiveProfileId: profileResult.activeProfileId,
          sessionXboxLiveProfileId: profileResult.activeProfileId,
          sessionGamertag: tag,
          sessionAvatar: avatar
        });
      }

      if (gamesDirectory) {
        const newGames = await scanGamesDirectory(gamesDirectory);
        if (newGames?.length) {
          for (const game of newGames) {
            updateGame(game.id, { genre: game.genre || 'Xbox 360' });
          }
        }
      }

      onComplete();
    } catch (err) {
      setError(err.message || 'Setup failed.');
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => {
    setError('');
    if (step === 'emulator' && !emulatorPath) {
      setError('Select xenia_canary.exe or xenia.exe to continue.');
      return;
    }
    if (step === 'profile') {
      finish();
      return;
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  return (
    <div className="boot-screen onboarding">
      <div className="boot-screen__inner">
        <div className="boot-progress">
          <div className="boot-progress__bar" style={{ width: `${progress}%` }} />
        </div>

        {step === 'welcome' && (
          <div className="boot-panel">
            <h1>Welcome to X360 Manager</h1>
            <p>Set up your emulator, game folder, and gamer profile in a few steps.</p>
          </div>
        )}

        {step === 'emulator' && (
          <div className="boot-panel">
            <h2>Emulator</h2>
            <p>Pick a build to download, or point to an existing Xenia .exe.</p>

            <div className="boot-version-list" role="radiogroup" aria-label="Xenia version">
              {EMULATOR_VERSIONS.map((v) => (
                <label
                  key={v.id}
                  className={`boot-version-option${downloadVersionId === v.id ? ' is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="xenia-version"
                    value={v.id}
                    checked={downloadVersionId === v.id}
                    onChange={() => setDownloadVersionId(v.id)}
                    disabled={downloading || busy}
                  />
                  <span className="boot-version-option__body">
                    <span className="boot-version-option__name">{v.name}</span>
                    <span className="boot-version-option__desc">{v.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="boot-emulator-actions">
              <button
                type="button"
                className="boot-btn boot-btn--primary"
                onClick={downloadSelectedVersion}
                disabled={downloading || busy}
              >
                <Download size={18} /> Download {selectedVersion.name}
              </button>
              <button
                type="button"
                className="boot-btn"
                onClick={pickEmulator}
                disabled={downloading || busy}
              >
                <FolderOpen size={18} /> I already have Xenia
              </button>
            </div>
            {downloading && (
              <div className="boot-download">
                <div className="boot-progress boot-progress--inline">
                  <div className="boot-progress__bar" style={{ width: `${downloadProgress}%` }} />
                </div>
                <p className="boot-download__status">{downloadLabel || `${Math.round(downloadProgress)}%`}</p>
              </div>
            )}
            {!downloading && downloadLabel && (
              <p className="boot-download__status">{downloadLabel}</p>
            )}
            {emulatorPath && (
              <p className="boot-path">{emulatorPath}</p>
            )}
          </div>
        )}

        {step === 'games' && (
          <div className="boot-panel">
            <h2>Games folder</h2>
            <p>Where your .iso, .xex, or .xbe files live. You can skip and add games later.</p>
            <button type="button" className="boot-btn" onClick={pickGamesDir}>
              <Gamepad2 size={18} /> Choose folder
            </button>
            {gamesDirectory && <p className="boot-path">{gamesDirectory}</p>}
          </div>
        )}

        {step === 'profile' && (
          <div className="boot-panel">
            <h2>Your profile</h2>
            <p>This gamertag is used when you launch games.</p>

            <div className="onboarding-avatar">
              <ProfileAvatar
                avatar={avatar}
                size={120}
                fallbackInitials={(gamertag || 'P').slice(0, 2).toUpperCase()}
              />
              <div className="onboarding-avatar__actions">
                <button type="button" className="boot-btn" onClick={() => setShowAvatarBuilder(true)}>
                  <Sparkles size={14} /> Customize avatar
                </button>
                <button
                  type="button"
                  className="boot-btn boot-btn--ghost"
                  onClick={() => setAvatar({ type: 'builder', config: randomAvatarConfig() })}
                >
                  Randomize
                </button>
              </div>
            </div>

            <label className="boot-label">
              Gamertag
              <input
                className="boot-input"
                value={gamertag}
                onChange={(e) => setGamertag(e.target.value)}
                placeholder="Player"
                maxLength={15}
                autoFocus
              />
            </label>
            <label className="profile-picker__remember" style={{ marginTop: 16 }}>
              <input type="checkbox" checked={usePin} onChange={(e) => setUsePin(e.target.checked)} />
              Protect this profile with a PIN
            </label>
            {showAvatarBuilder && (
              <AvatarBuilder
                initialAvatar={avatar}
                onCancel={() => setShowAvatarBuilder(false)}
                onSave={(next) => {
                  setAvatar(next);
                  setShowAvatarBuilder(false);
                }}
              />
            )}
            {usePin && (
              <>
                <label className="boot-label">
                  PIN
                  <input
                    type="password"
                    className="boot-input"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={16}
                  />
                </label>
                <label className="boot-label">
                  Confirm PIN
                  <input
                    type="password"
                    className="boot-input"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    maxLength={16}
                  />
                </label>
              </>
            )}
          </div>
        )}

        {error && <p className="boot-error">{error}</p>}

        <div className="boot-actions">
          {stepIndex > 0 && (
            <button type="button" className="boot-btn boot-btn--ghost" onClick={goBack} disabled={busy || downloading}>
              <ChevronLeft size={18} /> Back
            </button>
          )}
          <button
            type="button"
            className="boot-btn boot-btn--primary"
            onClick={goNext}
            disabled={busy || downloading}
          >
            {step === 'profile' ? (busy ? 'Finishing…' : 'Finish') : (
              <>Continue <ChevronRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
