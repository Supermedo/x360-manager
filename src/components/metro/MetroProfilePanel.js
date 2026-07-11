import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AvatarBuilder from '../AvatarBuilder';
import ProfileAvatar from '../ProfileAvatar';
import useGamepad, { resetGamepadHoldState, wasRecentGamepadInput } from '../../hooks/useGamepad';
import useInputMode from '../../hooks/useInputMode';
import useOverlayKeyboardTrap from '../../hooks/useOverlayKeyboardTrap';
import { avatarInitials, useXboxLiveProfileEditor } from '../../hooks/useXboxLiveProfileEditor';
import {
  XBOX_COUNTRIES,
  XBOX_LANGUAGES,
  SUBSCRIPTION_TIERS
} from '../../services/xboxLiveProfileMeta';
import { METRO_SOUNDS } from './metroConstants';
import MetroBladeNav from './MetroBladeNav';
import './MetroProfilePanel.css';

const playSound = (url) => {
  if (!url) return;
  try {
    const audio = new Audio(url);
    audio.volume = 0.35;
    audio.play().catch(() => {});
  } catch { /* ignore */ }
};

const CONTROLLER_SLOTS = [
  { value: 0, label: 'Player 1' },
  { value: 1, label: 'Player 2' },
  { value: 2, label: 'Player 3' },
  { value: 3, label: 'Player 4' }
];

const PROFILE_NAV = [
  { id: 'edit', label: 'Edit Profile' },
  { id: 'defaults', label: 'Game Defaults' },
  { id: 'signin', label: 'Sign-in Preferences' },
  { id: 'security', label: 'Account Security' }
];

const cycleIndex = (options, currentValue, dir) => {
  const idx = options.findIndex((o) => o.value === currentValue);
  const base = idx >= 0 ? idx : 0;
  const next = (base + dir + options.length) % options.length;
  return options[next].value;
};

const MetroProfilePanel = ({ onClose, onSwitchProfile }) => {
  const { allowMouseHover } = useInputMode();
  const rowRefs = useRef([]);
  const navRefs = useRef([]);
  const gamertagRef = useRef(null);
  const overlayReadyRef = useRef(false);
  const [activeNavIdx, setActiveNavIdx] = useState(0);
  const [navFocusIdx, setNavFocusIdx] = useState(0);
  const [focusZone, setFocusZone] = useState('nav');
  const [contentIdx, setContentIdx] = useState(0);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingField, setEditingField] = useState(null);

  const editor = useXboxLiveProfileEditor({ onSwitchProfile });
  const {
    sessionId,
    profile,
    draft,
    setDraft,
    hasPin,
    avatar,
    setAvatar,
    pinDraft,
    setPinDraft,
    pinMode,
    setPinMode,
    status,
    statusKind,
    loading,
    loadMyProfile,
    handleSave,
    handleDelete,
    handleExport,
    openProfileFolder
  } = editor;

  const activeNav = PROFILE_NAV[activeNavIdx] || PROFILE_NAV[0];

  const navListEntries = useMemo(
    () => PROFILE_NAV.map((item, index) => ({ item, index })).filter(({ index }) => index !== activeNavIdx),
    [activeNavIdx]
  );

  const switchNavSection = useCallback((originalIndex) => {
    setActiveNavIdx(originalIndex);
    setNavFocusIdx(0);
    setContentIdx(0);
    setEditingField(null);
  }, []);

  const switchNavById = useCallback((id) => {
    const idx = PROFILE_NAV.findIndex((item) => item.id === id);
    if (idx >= 0) switchNavSection(idx);
  }, [switchNavSection]);

  const selectFocusedNav = useCallback(() => {
    const entry = navListEntries[navFocusIdx];
    if (entry) switchNavSection(entry.index);
  }, [navFocusIdx, navListEntries, switchNavSection]);

  const contentRows = useMemo(() => {
    if (!sessionId || !profile) return [];

    switch (activeNav.id) {
      case 'edit':
        return [
          { id: 'avatar', type: 'action', label: 'Avatar', action: 'editAvatar' },
          { id: 'gamertag', type: 'text', label: 'Username', field: 'gamertag' }
        ];
      case 'defaults':
        return [
          { id: 'region', type: 'cycle', label: 'Region', field: 'country', options: XBOX_COUNTRIES },
          { id: 'language', type: 'cycle', label: 'Language', field: 'language', options: XBOX_LANGUAGES },
          { id: 'controller', type: 'cycle', label: 'Controller', field: 'controllerSlot', options: CONTROLLER_SLOTS }
        ];
      case 'signin':
        return [
          { id: 'xboxlive', type: 'toggle', label: 'Xbox Live', field: 'xboxLiveEnabled' },
          {
            id: 'subscription',
            type: 'cycle',
            label: 'Subscription',
            field: 'subscriptionTier',
            options: SUBSCRIPTION_TIERS,
            disabled: !draft.xboxLiveEnabled
          }
        ].filter((r) => !r.disabled);
      case 'security': {
        const rows = [];
        if (!hasPin && pinMode === 'none') {
          rows.push({ id: 'pin-set', type: 'action', label: 'Set profile PIN', action: 'pinSet' });
        } else if (hasPin && pinMode === 'none') {
          rows.push(
            { id: 'pin-change', type: 'action', label: 'Change PIN', action: 'pinChange' },
            { id: 'pin-remove', type: 'action', label: 'Remove PIN', action: 'pinRemove' }
          );
        }
        if (pinMode !== 'none') {
          if (hasPin && pinMode !== 'set') {
            rows.push({ id: 'pin-current', type: 'pin', label: 'Current PIN', pinField: 'currentPin' });
          }
          if (pinMode === 'set' || pinMode === 'change') {
            rows.push(
              { id: 'pin-new', type: 'pin', label: 'New PIN', pinField: 'newPin' },
              { id: 'pin-confirm', type: 'pin', label: 'Confirm PIN', pinField: 'confirmPin' }
            );
          }
        }
        rows.push(
          { id: 'save', type: 'action', label: 'Save profile', action: 'save' },
          { id: 'export', type: 'action', label: 'Export profile', action: 'export' },
          { id: 'folder', type: 'action', label: 'Open profile folder', action: 'folder' },
          { id: 'switch', type: 'action', label: 'Switch profile', action: 'switchProfile' },
          { id: 'refresh', type: 'action', label: 'Refresh', action: 'refresh' },
          { id: 'delete', type: 'action', label: 'Delete profile', action: 'delete', danger: true }
        );
        return rows;
      }
      default:
        return [];
    }
  }, [activeNav.id, draft.xboxLiveEnabled, hasPin, pinMode, profile, sessionId]);

  const focusedRow = contentRows[contentIdx];

  const rowDisplayValue = useCallback((row) => {
    if (!row) return '';
    if (row.type === 'text') return draft[row.field] || 'Player';
    if (row.type === 'cycle') {
      const val = draft[row.field];
      return row.options.find((o) => o.value === val)?.label || String(val);
    }
    if (row.type === 'toggle') return draft[row.field] ? 'On' : 'Off';
    if (row.type === 'pin') return pinDraft[row.pinField] ? '••••' : '(Enter PIN)';
    if (row.type === 'action' && row.id === 'avatar') return 'Edit';
    if (row.type === 'action') return '›';
    return '';
  }, [draft, pinDraft]);

  const activateRow = useCallback(async (row) => {
    if (!row || loading) return;
    playSound(METRO_SOUNDS.select);

    switch (row.action) {
      case 'editAvatar':
        setShowBuilder(true);
        break;
      case 'switchProfile':
        onSwitchProfile?.();
        break;
      case 'refresh':
        await loadMyProfile();
        break;
      case 'save':
        await handleSave();
        break;
      case 'export':
        await handleExport();
        break;
      case 'folder':
        openProfileFolder();
        break;
      case 'delete':
        await handleDelete();
        break;
      case 'pinSet':
        setPinMode('set');
        break;
      case 'pinChange':
        setPinMode('change');
        break;
      case 'pinRemove':
        setPinMode('remove');
        break;
      default:
        break;
    }

    if (row.type === 'toggle') {
      setDraft((d) => {
        const next = !d[row.field];
        return {
          ...d,
          [row.field]: next,
          signInState: row.field === 'xboxLiveEnabled' ? (next ? 2 : 1) : d.signInState,
          subscriptionTier: row.field === 'xboxLiveEnabled' && !next ? 0 : d.subscriptionTier
        };
      });
    }

    if (row.type === 'text') {
      setEditingField(row.field);
      setTimeout(() => gamertagRef.current?.focus(), 0);
    }

    if (row.type === 'pin') {
      setEditingField(row.pinField);
    }
  }, [
    handleDelete,
    handleExport,
    handleSave,
    loadMyProfile,
    loading,
    onSwitchProfile,
    openProfileFolder,
    setDraft,
    setPinMode
  ]);

  const cycleRow = useCallback((row, dir) => {
    if (!row?.options) return;
    playSound(dir < 0 ? METRO_SOUNDS.left : METRO_SOUNDS.right);
    setDraft((d) => ({
      ...d,
      [row.field]: cycleIndex(row.options, d[row.field], dir)
    }));
  }, [setDraft]);

  const enterContent = useCallback(() => {
    if (!profile || contentRows.length === 0) return;
    playSound(METRO_SOUNDS.select);
    setFocusZone('content');
    setContentIdx(0);
    setEditingField(null);
  }, [contentRows.length, profile]);

  const leaveContent = useCallback(() => {
    playSound(METRO_SOUNDS.back);
    setFocusZone('nav');
    setEditingField(null);
  }, []);

  useEffect(() => {
    resetGamepadHoldState();
    overlayReadyRef.current = false;
    const timer = window.setTimeout(() => {
      overlayReadyRef.current = true;
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setContentIdx(0);
    setEditingField(null);
    setNavFocusIdx(0);
  }, [activeNavIdx]);

  useEffect(() => {
    if (contentIdx >= contentRows.length) {
      setContentIdx(Math.max(0, contentRows.length - 1));
    }
  }, [contentIdx, contentRows.length]);

  useEffect(() => {
    if (focusZone === 'content') {
      rowRefs.current[contentIdx]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    } else {
      navRefs.current[navFocusIdx]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }, [contentIdx, focusZone, navFocusIdx]);

  useEffect(() => () => setShowBuilder(false), []);

  useOverlayKeyboardTrap(true, (event) => {
    if (wasRecentGamepadInput() && event.key !== 'Escape') return;

    if (event.key === 'Escape') {
      if (editingField) {
        setEditingField(null);
        return;
      }
      if (pinMode !== 'none') {
        setPinMode('none');
        return;
      }
      if (focusZone === 'content') {
        leaveContent();
        return;
      }
      onClose?.();
      return;
    }

    if (focusZone === 'nav') {
      if (event.key === 'ArrowUp') setNavFocusIdx((i) => Math.max(0, i - 1));
      else if (event.key === 'ArrowDown') setNavFocusIdx((i) => Math.min(navListEntries.length - 1, i + 1));
      else if (event.key === 'ArrowRight') enterContent();
      else if (event.key === 'Enter') {
        selectFocusedNav();
        enterContent();
      }
      return;
    }

    if (event.key === 'ArrowLeft') leaveContent();
    else if (event.key === 'ArrowUp') setContentIdx((i) => Math.max(0, i - 1));
    else if (event.key === 'ArrowDown') setContentIdx((i) => Math.min(contentRows.length - 1, i + 1));
    else if (event.key === 'Enter') {
      if (focusedRow?.type === 'cycle') cycleRow(focusedRow, 1);
      else activateRow(focusedRow);
    } else if (event.key === 'ArrowRight' && focusedRow?.type === 'cycle') cycleRow(focusedRow, 1);
    else if (event.key === 'ArrowLeft' && focusedRow?.type === 'cycle') cycleRow(focusedRow, -1);
  });

  useGamepad({
    left: () => {
      if (!overlayReadyRef.current) return;
      if (focusZone === 'content' && focusedRow?.type === 'cycle') cycleRow(focusedRow, -1);
      else if (focusZone === 'content') leaveContent();
    },
    right: () => {
      if (!overlayReadyRef.current) return;
      if (focusZone === 'nav') enterContent();
      else if (focusedRow?.type === 'cycle') cycleRow(focusedRow, 1);
    },
    up: () => {
      if (!overlayReadyRef.current) return;
      playSound(METRO_SOUNDS.left);
      if (focusZone === 'nav') setNavFocusIdx((i) => Math.max(0, i - 1));
      else setContentIdx((i) => Math.max(0, i - 1));
    },
    down: () => {
      if (!overlayReadyRef.current) return;
      playSound(METRO_SOUNDS.right);
      if (focusZone === 'nav') setNavFocusIdx((i) => Math.min(navListEntries.length - 1, i + 1));
      else setContentIdx((i) => Math.min(contentRows.length - 1, i + 1));
    },
    confirm: () => {
      if (!overlayReadyRef.current || editingField) return;
      if (focusZone === 'nav') {
        selectFocusedNav();
        enterContent();
      } else if (focusedRow?.type === 'cycle') cycleRow(focusedRow, 1);
      else activateRow(focusedRow);
    },
    back: () => {
      if (!overlayReadyRef.current) return;
      playSound(METRO_SOUNDS.back);
      if (editingField) {
        setEditingField(null);
        return;
      }
      if (pinMode !== 'none') {
        setPinMode('none');
        return;
      }
      if (showBuilder) {
        setShowBuilder(false);
        return;
      }
      if (focusZone === 'content') leaveContent();
      else onClose?.();
    },
    menu: () => {
      playSound(METRO_SOUNDS.back);
      onClose?.();
    }
  }, true, 200);

  const statusLine = draft.xboxLiveEnabled ? 'Online' : 'Offline';

  const emptyState = !sessionId || (!profile && !loading);

  return (
    <div className="metro-profile-overlay" role="dialog" aria-label="Account">
      <div className={`metro-profile-blade${loading ? ' is-loading' : ''}`}>
        <MetroBladeNav
          items={PROFILE_NAV}
          activeIndex={activeNavIdx}
          focusIndex={navFocusIdx}
          focused={focusZone === 'nav'}
          itemRefs={navRefs}
          onSelect={switchNavById}
          onFocusIndex={setNavFocusIdx}
          allowMouseHover={allowMouseHover}
        />

        <div className="metro-profile-blade__content">
          {emptyState ? (
            <div className="metro-profile-blade__empty">
              <h2>My profile</h2>
              <p>{!sessionId ? 'No profile signed in.' : (status || 'Profile unavailable.')}</p>
              <button
                type="button"
                className="metro-profile-blade__empty-btn"
                onClick={onSwitchProfile}
              >
                {!sessionId ? 'Choose profile' : 'Switch profile'}
              </button>
            </div>
          ) : (
            <>
              <div className="metro-profile-blade__card">
                <div className="metro-profile-blade__card-inner">
                  <div className="metro-profile-blade__card-avatar">
                    <ProfileAvatar
                      avatar={avatar}
                      size={72}
                      fallbackInitials={avatarInitials(draft.gamertag)}
                    />
                  </div>
                  <div className="metro-profile-blade__card-text">
                    <div className="metro-profile-blade__card-name">{draft.gamertag || 'Player'}</div>
                    <div className="metro-profile-blade__card-status">{statusLine}</div>
                  </div>
                </div>
              </div>

              <div className="metro-profile-blade__fields">
                {contentRows.map((row, index) => {
                  const isFocused = focusZone === 'content' && index === contentIdx;
                  const isEditing = editingField === row.field || editingField === row.pinField;

                  return (
                    <div
                      key={row.id}
                      className={`metro-profile-blade__field${isFocused ? ' is-focused' : ''}${row.danger ? ' is-danger' : ''}`}
                    >
                      <label className="metro-profile-blade__field-label">{row.label}</label>
                      {row.type === 'text' && isEditing ? (
                        <input
                          ref={gamertagRef}
                          type="text"
                          className="metro-profile-blade__field-input"
                          maxLength={15}
                          value={draft.gamertag}
                          onChange={(e) => setDraft((d) => ({ ...d, gamertag: e.target.value }))}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setEditingField(null); }}
                        />
                      ) : row.type === 'pin' && isEditing ? (
                        <input
                          type="password"
                          className="metro-profile-blade__field-input"
                          value={pinDraft[row.pinField]}
                          onChange={(e) => setPinDraft((d) => ({ ...d, [row.pinField]: e.target.value }))}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setEditingField(null); }}
                        />
                      ) : (
                        <button
                          type="button"
                          ref={(n) => { rowRefs.current[index] = n; }}
                          className="metro-profile-blade__field-box"
                          disabled={loading}
                          onClick={() => {
                            setFocusZone('content');
                            setContentIdx(index);
                            if (row.type === 'cycle') cycleRow(row, 1);
                            else activateRow(row);
                          }}
                          onMouseEnter={() => {
                            if (allowMouseHover()) {
                              setFocusZone('content');
                              setContentIdx(index);
                            }
                          }}
                        >
                          {rowDisplayValue(row)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {status && (
                <p className={`metro-profile-blade__status${statusKind === 'warn' ? ' is-warn' : ''}`}>
                  {status}
                </p>
              )}
            </>
          )}

          <footer className="metro-profile-blade__hints">
            {focusZone === 'nav' ? (
              <>
                <span><span className="metro-hint-btn metro-hint-btn--a">A</span> Select section</span>
                <span><span className="metro-hint-btn metro-hint-btn--b">B</span> Back</span>
                <span>→ Open section</span>
              </>
            ) : (
              <>
                <span><span className="metro-hint-btn metro-hint-btn--a">A</span> Select</span>
                <span><span className="metro-hint-btn metro-hint-btn--b">B</span> Menu</span>
                <span>← → Change</span>
              </>
            )}
          </footer>
        </div>
      </div>

      {showBuilder && (
        <AvatarBuilder
          initialAvatar={avatar}
          onCancel={() => setShowBuilder(false)}
          onSave={(next) => {
            setAvatar(next);
            setShowBuilder(false);
          }}
        />
      )}
    </div>
  );
};

export default MetroProfilePanel;
