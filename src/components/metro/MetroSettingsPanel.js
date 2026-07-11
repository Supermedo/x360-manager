import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { GameContext } from '../../context/GameContext';
import { SettingsContext } from '../../context/SettingsContext';
import useAppFullscreen from '../../hooks/useAppFullscreen';
import useGamepad, { wasRecentGamepadInput, resetGamepadHoldState } from '../../hooks/useGamepad';
import useOverlayKeyboardTrap from '../../hooks/useOverlayKeyboardTrap';
import useInputMode from '../../hooks/useInputMode';
import useTranslation from '../../hooks/useTranslation';
import { localCoverResetPatch } from '../../services/coverService';
import { METRO_SOUNDS } from './metroConstants';
import {
  CONSOLE_APP_TABS,
  buildAppTabRows,
  buildGameSettingRows,
  selectableRowIndices
} from './metroSettingsRows';
import MetroBladeNav from './MetroBladeNav';
import GamePatchesModal from '../GamePatchesModal';
import './MetroSettingsPanel.css';

const playSound = (url) => {
  if (!url) return;
  try {
    const audio = new Audio(url);
    audio.volume = 0.35;
    audio.play().catch(() => {});
  } catch { /* ignore */ }
};

const formatBytes = (bytes) => {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatRowValue = (row) => {
  if (row.type === 'info') return row.getValue?.() || '';
  if (row.type === 'toggle') return row.getValue?.() ? 'On' : 'Off';
  if (row.type === 'cycle') {
    const val = row.getValue?.();
    const opt = row.options?.find((o) => o.value === val);
    return opt?.label || val || '';
  }
  if (row.type === 'action') {
    if (row.getValue) return row.getValue();
    return '›';
  }
  return '';
};

const MetroSettingsPanel = ({
  mode = 'app',
  game = null,
  initialTabId = 'interface',
  onClose,
  onSwitchProfile,
  onExitConsole,
  onLaunchGame,
  onTogglePin,
  updateGame
}) => {
  const { settings, updateSettings, resetSettings } = useContext(SettingsContext);
  const { games, scanGamesDirectory, batchUpdateGames } = useContext(GameContext);
  const { isFullscreen, setFullscreen, toggleFullscreen } = useAppFullscreen();
  const { t } = useTranslation();
  const { allowMouseHover } = useInputMode();
  const rowRefs = useRef([]);
  const tabRefs = useRef([]);
  const overlayReadyRef = useRef(false);
  const [tabIndex, setTabIndex] = useState(() => {
    const idx = CONSOLE_APP_TABS.findIndex((t) => t.id === initialTabId);
    return idx >= 0 ? idx : 0;
  });
  const [tabFocusIdx, setTabFocusIdx] = useState(0);
  const [focusZone, setFocusZone] = useState(mode === 'app' ? 'tabs' : 'rows');
  const [focusIdx, setFocusIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [coverCacheLabel, setCoverCacheLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [patchesOpen, setPatchesOpen] = useState(false);

  const activeTab = CONSOLE_APP_TABS[tabIndex];

  const tabNavItems = useMemo(
    () => CONSOLE_APP_TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey) })),
    [t]
  );

  const tabListEntries = useMemo(
    () => tabNavItems.map((item, index) => ({ item, index })),
    [tabNavItems]
  );

  const resolveTabId = useCallback((id) => {
    const idx = CONSOLE_APP_TABS.findIndex((tab) => tab.id === id);
    return idx >= 0 ? idx : null;
  }, []);

  const switchTab = useCallback((originalIndex) => {
    setTabIndex(originalIndex);
    setTabFocusIdx(originalIndex);
    setFocusIdx(0);
  }, []);

  const switchTabById = useCallback((id) => {
    const idx = resolveTabId(id);
    if (idx !== null) switchTab(idx);
  }, [resolveTabId, switchTab]);

  const selectFocusedTab = useCallback(() => {
    const entry = tabListEntries[tabFocusIdx];
    if (entry) switchTab(entry.index);
  }, [switchTab, tabFocusIdx, tabListEntries]);

  const enterRows = useCallback(() => {
    if (mode !== 'app') return;
    playSound(METRO_SOUNDS.select);
    setFocusZone('rows');
  }, [mode]);

  const leaveRows = useCallback(() => {
    if (mode !== 'app') return;
    playSound(METRO_SOUNDS.back);
    setFocusZone('tabs');
  }, [mode]);

  const ctx = useMemo(() => ({
    settings,
    isFullscreen,
    updateSettings,
    setFullscreen,
    saveGameConfig: (patch) => {
      if (!game) return;
      updateGame(game.id, {
        config: { ...(game.config || {}), ...patch }
      });
      setTick((n) => n + 1);
    },
    setFavorite: (value) => {
      if (!game) return;
      const current = Boolean(game.isFavorite);
      if (Boolean(value) !== current) {
        onTogglePin?.(game);
        setTick((n) => n + 1);
      }
    }
  }), [game, isFullscreen, onTogglePin, settings, updateGame, updateSettings]);

  const loadCoverCacheStats = useCallback(async () => {
    if (!window.electronAPI?.getCoverCacheStats) {
      setCoverCacheLabel('Desktop only');
      return;
    }
    const stats = await window.electronAPI.getCoverCacheStats();
    if (stats?.ok) {
      setCoverCacheLabel(`${stats.fileCount} file(s), ${formatBytes(stats.bytes)}`);
    } else {
      setCoverCacheLabel(t('loadingCacheInfo'));
    }
  }, [t]);

  useEffect(() => {
    if (mode === 'app' && activeTab?.id === 'advanced') {
      loadCoverCacheStats();
    }
  }, [activeTab?.id, loadCoverCacheStats, mode, tabIndex]);

  const rows = useMemo(() => {
    if (mode === 'game' && game) {
      return buildGameSettingRows(game, settings, t);
    }
    const tabRows = buildAppTabRows(activeTab?.id, settings, t, isFullscreen);
    if (activeTab?.id === 'advanced') {
      return tabRows.map((row) => (
        row.id === 'coverCacheInfo'
          ? { ...row, getValue: () => coverCacheLabel || t('loadingCacheInfo') }
          : row
      ));
    }
    return tabRows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id, coverCacheLabel, game, isFullscreen, mode, settings, t, tick]);

  const selectable = useMemo(() => selectableRowIndices(rows), [rows]);
  const focusedRowIndex = selectable[focusIdx] ?? selectable[0] ?? 0;
  const focusedRow = rows[focusedRowIndex];

  useEffect(() => {
    setFocusIdx(0);
    setTabFocusIdx(0);
  }, [tabIndex, mode]);

  useEffect(() => {
    if (focusIdx >= selectable.length) setFocusIdx(Math.max(0, selectable.length - 1));
  }, [focusIdx, selectable.length]);

  useEffect(() => {
    if (focusZone === 'rows') {
      rowRefs.current[focusedRowIndex]?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    } else if (mode === 'app') {
      tabRefs.current[tabFocusIdx]?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [focusedRowIndex, focusZone, mode, tabFocusIdx, tabIndex]);

  const runAction = useCallback(async (action) => {
    if (busy) return;
    switch (action) {
      case 'browseEmulatorPath': {
        const path = await window.electronAPI?.selectEmulatorPath?.();
        if (path) updateSettings({ emulatorPath: path });
        break;
      }
      case 'browseGamesDirectory': {
        const path = await window.electronAPI?.selectDirectory?.();
        if (path) updateSettings({ gamesDirectory: path });
        break;
      }
      case 'scanGames': {
        if (!settings.gamesDirectory) break;
        setBusy(true);
        try {
          await scanGamesDirectory(settings.gamesDirectory);
          window.electronAPI?.showMessageBox?.({
            type: 'info',
            title: 'Scan Complete',
            message: 'Directory scanned successfully!'
          });
        } finally {
          setBusy(false);
        }
        break;
      }
      case 'switchProfile':
        onSwitchProfile?.();
        break;
      case 'refreshCoverCache':
        await loadCoverCacheStats();
        break;
      case 'clearCoverCache': {
        if (!window.electronAPI?.clearCoverCache) break;
        setBusy(true);
        try {
          const stats = await window.electronAPI.getCoverCacheStats();
          const count = stats?.fileCount ?? 0;
          if (count === 0) break;
          const result = await window.electronAPI.clearCoverCache();
          if (result?.ok) {
            const updatesMap = {};
            games.forEach((g) => {
              const patch = localCoverResetPatch(g);
              if (patch) updatesMap[g.id] = patch;
            });
            if (Object.keys(updatesMap).length > 0) batchUpdateGames(updatesMap);
            await loadCoverCacheStats();
          }
        } finally {
          setBusy(false);
        }
        break;
      }
      case 'downloadPatches': {
        if (!settings.emulatorPath) break;
        setBusy(true);
        try {
          const res = await window.electronAPI?.downloadPatches?.(settings.emulatorPath);
          if (res?.success) {
            window.electronAPI?.showMessageBox?.({
              type: 'info',
              title: 'Success',
              message: `Downloaded ${res.count} game patches.`
            });
          }
        } finally {
          setBusy(false);
        }
        break;
      }
      case 'openPatchesFolder':
        if (settings.emulatorPath) {
          await window.electronAPI?.openPatchesFolder?.(settings.emulatorPath);
        }
        break;
      case 'runSetupWizard':
        updateSettings({ onboardingCompleted: false });
        window.location.reload();
        break;
      case 'resetSettings':
        resetSettings();
        setTick((n) => n + 1);
        break;
      case 'exitConsole':
        onExitConsole?.();
        break;
      case 'launch':
        onLaunchGame?.(game);
        onClose?.();
        break;
      case 'configurePatches':
        setPatchesOpen(true);
        break;
      default:
        break;
    }
  }, [
    batchUpdateGames,
    busy,
    game,
    games,
    loadCoverCacheStats,
    onClose,
    onExitConsole,
    onLaunchGame,
    onSwitchProfile,
    onTogglePin,
    resetSettings,
    scanGamesDirectory,
    settings.emulatorPath,
    settings.gamesDirectory,
    updateSettings
  ]);

  const cycleRow = useCallback(async (row, dir) => {
    if (!row || row.type === 'section' || row.type === 'info') return;
    playSound(dir < 0 ? METRO_SOUNDS.left : METRO_SOUNDS.right);

    if (row.type === 'toggle') {
      const next = !row.getValue();
      await row.apply(ctx, next);
      setTick((n) => n + 1);
      return;
    }

    if (row.type === 'cycle') {
      const current = row.getValue();
      const idx = row.options.findIndex((o) => o.value === current);
      const base = idx >= 0 ? idx : 0;
      const next = row.options[(base + dir + row.options.length) % row.options.length];
      await row.apply(ctx, next.value);
      setTick((n) => n + 1);
    }
  }, [ctx]);

  const activateRow = useCallback(async (row) => {
    if (!row || row.type === 'section' || row.type === 'info') return;
    playSound(METRO_SOUNDS.select);

    if (row.type === 'action') {
      await runAction(row.action);
      setTick((n) => n + 1);
      return;
    }

    if (row.type === 'toggle') {
      const next = !row.getValue();
      await row.apply(ctx, next);
      setTick((n) => n + 1);
      return;
    }

    if (row.type === 'cycle') {
      const current = row.getValue();
      const idx = row.options.findIndex((o) => o.value === current);
      const next = row.options[(idx + 1) % row.options.length];
      await row.apply(ctx, next.value);
      setTick((n) => n + 1);
    }
  }, [ctx, runAction]);

  const moveTab = useCallback((dir) => {
    playSound(dir < 0 ? METRO_SOUNDS.left : METRO_SOUNDS.right);
    setTabIndex((i) => {
      const next = (i + dir + CONSOLE_APP_TABS.length) % CONSOLE_APP_TABS.length;
      setTabFocusIdx(next);
      return next;
    });
    setFocusIdx(0);
  }, []);

  useEffect(() => {
    const idx = CONSOLE_APP_TABS.findIndex((t) => t.id === initialTabId);
    if (idx >= 0) setTabIndex(idx);
    setFocusIdx(0);
    setTabFocusIdx(0);
    setFocusZone(mode === 'app' ? 'tabs' : 'rows');
  }, [initialTabId, mode]);

  useEffect(() => {
    resetGamepadHoldState();
    overlayReadyRef.current = false;
    const timer = window.setTimeout(() => {
      overlayReadyRef.current = true;
    }, 650);
    return () => window.clearTimeout(timer);
  }, []);

  useOverlayKeyboardTrap(true, (event) => {
    if (wasRecentGamepadInput() && event.key !== 'Escape') return;
    if (event.key === 'Escape') {
      onClose?.();
      return;
    }

    if (mode === 'app' && focusZone === 'tabs') {
      if (event.key === 'ArrowUp') setTabFocusIdx((i) => Math.max(0, i - 1));
      else if (event.key === 'ArrowDown') setTabFocusIdx((i) => Math.min(tabNavItems.length - 1, i + 1));
      else if (event.key === 'ArrowRight') enterRows();
      else if (event.key === 'Enter') {
        selectFocusedTab();
        enterRows();
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      setFocusIdx((i) => Math.max(0, i - 1));
    } else if (event.key === 'ArrowDown') {
      setFocusIdx((i) => Math.min(selectable.length - 1, i + 1));
    } else if (event.key === 'Enter') {
      activateRow(focusedRow);
    } else if (event.key === 'ArrowLeft') {
      if (mode === 'app' && focusZone === 'rows' && !(focusedRow?.type === 'cycle' || focusedRow?.type === 'toggle')) {
        leaveRows();
      } else if (focusedRow && (focusedRow.type === 'cycle' || focusedRow.type === 'toggle')) {
        cycleRow(focusedRow, -1);
      }
    } else if (event.key === 'ArrowRight') {
      if (focusedRow && (focusedRow.type === 'cycle' || focusedRow.type === 'toggle')) {
        cycleRow(focusedRow, 1);
      }
    }
  });

  useGamepad({
    left: () => {
      if (mode === 'app' && focusZone === 'rows' && !(focusedRow?.type === 'cycle' || focusedRow?.type === 'toggle')) {
        leaveRows();
      } else if (focusedRow && (focusedRow.type === 'cycle' || focusedRow.type === 'toggle')) {
        cycleRow(focusedRow, -1);
      }
    },
    right: () => {
      if (mode === 'app' && focusZone === 'tabs') {
        enterRows();
      } else if (focusedRow && (focusedRow.type === 'cycle' || focusedRow.type === 'toggle')) {
        cycleRow(focusedRow, 1);
      }
    },
    up: () => {
      playSound(METRO_SOUNDS.left);
      if (mode === 'app' && focusZone === 'tabs') {
        setTabFocusIdx((i) => Math.max(0, i - 1));
      } else {
        setFocusIdx((i) => Math.max(0, i - 1));
      }
    },
    down: () => {
      playSound(METRO_SOUNDS.right);
      if (mode === 'app' && focusZone === 'tabs') {
        setTabFocusIdx((i) => Math.min(tabNavItems.length - 1, i + 1));
      } else {
        setFocusIdx((i) => Math.min(selectable.length - 1, i + 1));
      }
    },
    prevTab: () => { if (mode === 'app') moveTab(-1); },
    nextTab: () => { if (mode === 'app') moveTab(1); },
    actionX: () => {
      if (mode === 'game' && game) {
        playSound(METRO_SOUNDS.select);
        onTogglePin?.(game);
        setTick((n) => n + 1);
      }
    },
    actionY: () => {},
    confirm: () => {
      if (!overlayReadyRef.current) return;
      if (mode === 'app' && focusZone === 'tabs') {
        selectFocusedTab();
        enterRows();
      } else {
        activateRow(focusedRow);
      }
    },
    back: () => {
      playSound(METRO_SOUNDS.back);
      if (mode === 'app' && focusZone === 'rows') leaveRows();
      else onClose?.();
    },
    menu: () => {
      playSound(METRO_SOUNDS.select);
      toggleFullscreen();
    }
  }, true, 200);

  const title = mode === 'game' ? (game?.name || 'Game Options') : t('globalSettings');
  const tabLabel = mode === 'app' && activeTab ? t(activeTab.labelKey) : null;

  const settingsBody = (
    <>
      <header className="metro-settings-panel__header">
        {mode === 'game' && (
          <button
            type="button"
            className="metro-settings-panel__back"
            onClick={onClose}
          >
            ← Back
          </button>
        )}
        <h2>{title}</h2>
        {mode === 'game' && (
          <p className="metro-settings-panel__header-sub">Per-game launch options</p>
        )}
        {mode === 'app' && tabLabel && (
          <p className="metro-settings-panel__page">{tabIndex + 1} / {CONSOLE_APP_TABS.length}</p>
        )}
      </header>
      <ul className="metro-settings-panel__list">
        {rows.map((row, index) => {
          if (row.type === 'section') {
            return (
              <li key={row.id} className="metro-settings-panel__section">
                {row.label}
              </li>
            );
          }
          if (row.type === 'info') {
            return (
              <li key={row.id} className="metro-settings-panel__info">
                <span className="metro-settings-panel__row-label">{row.label}</span>
                <span className="metro-settings-panel__row-value">{formatRowValue(row)}</span>
              </li>
            );
          }
          const isFocused = focusZone === 'rows' && index === focusedRowIndex;
          return (
            <li key={row.id}>
              <button
                type="button"
                ref={(n) => { rowRefs.current[index] = n; }}
                className={`metro-settings-panel__row${isFocused ? ' is-focused' : ''}${busy ? ' is-busy' : ''}`}
                disabled={busy}
                onClick={() => {
                  setFocusZone('rows');
                  setFocusIdx(selectable.indexOf(index));
                  activateRow(row);
                }}
                onMouseEnter={() => {
                  if (allowMouseHover()) {
                    setFocusZone('rows');
                    const si = selectable.indexOf(index);
                    if (si >= 0) setFocusIdx(si);
                  }
                }}
              >
                <span className="metro-settings-panel__row-label">{row.label}</span>
                <span className="metro-settings-panel__row-value">{formatRowValue(row)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="metro-settings-panel__hints">
        {mode === 'app' && focusZone === 'tabs' ? (
          <>
            <span><span className="metro-hint-btn metro-hint-btn--a">A</span> Select tab</span>
            <span><span className="metro-hint-btn metro-hint-btn--b">B</span> Back</span>
            <span>→ Open tab</span>
            <span><span className="metro-hint-btn metro-hint-btn--lb">LB</span><span className="metro-hint-btn metro-hint-btn--rb">RB</span> Quick tab</span>
          </>
        ) : (
          <>
            <span><span className="metro-hint-btn metro-hint-btn--a">A</span> Change</span>
            <span><span className="metro-hint-btn metro-hint-btn--b">B</span> {mode === 'app' ? 'Menu' : 'Back'}</span>
            {mode === 'game' && (
              <span><span className="metro-hint-btn metro-hint-btn--x">X</span> Favorite</span>
            )}
            {mode === 'app' && (
              <>
                <span><span className="metro-hint-btn metro-hint-btn--lb">LB</span><span className="metro-hint-btn metro-hint-btn--rb">RB</span> Tab</span>
                <span>← → Change value</span>
              </>
            )}
            <span><span className="metro-hint-btn metro-hint-btn--start">☰</span> Fullscreen</span>
          </>
        )}
      </footer>
    </>
  );

  return (
    <div className="metro-settings-overlay" role="dialog" aria-label={title}>
      <div className={`metro-settings-panel${mode === 'app' ? ' metro-settings-panel--blade' : ''}`}>
        {mode === 'app' && (
          <MetroBladeNav
            items={tabNavItems}
            activeIndex={tabIndex}
            focusIndex={tabFocusIdx}
            focused={focusZone === 'tabs'}
            mode="full"
            itemRefs={tabRefs}
            onSelect={switchTabById}
            onFocusIndex={setTabFocusIdx}
            allowMouseHover={allowMouseHover}
          />
        )}
        <div className="metro-settings-panel__body">
          {settingsBody}
        </div>
      </div>
      {patchesOpen && mode === 'game' && game && (
        <GamePatchesModal
          game={game}
          settings={settings}
          onClose={() => setPatchesOpen(false)}
          updateGame={updateGame}
        />
      )}
    </div>
  );
};

export default MetroSettingsPanel;
