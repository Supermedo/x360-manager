import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SettingsContext } from '../context/SettingsContext';

const applyFullscreenClass = (enabled) => {
  document.body.classList.toggle('app-fullscreen', Boolean(enabled));
};

export const useAppFullscreen = () => {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(settings.appFullscreen));

  const syncFromMain = useCallback(async () => {
    const state = await window.electronAPI?.isFullScreen?.();
    if (typeof state === 'boolean') {
      setIsFullscreen(state);
      applyFullscreenClass(state);
    }
  }, []);

  const setFullscreen = useCallback(async (enabled) => {
    const next = await window.electronAPI?.setFullScreen?.(Boolean(enabled));
    if (typeof next === 'boolean') {
      setIsFullscreen(next);
      applyFullscreenClass(next);
      updateSettings({ appFullscreen: next });
      return next;
    }
    await syncFromMain();
    return false;
  }, [syncFromMain, updateSettings]);

  const toggleFullscreen = useCallback(async () => {
    const next = await window.electronAPI?.toggleFullScreen?.();
    if (typeof next === 'boolean') {
      setIsFullscreen(next);
      applyFullscreenClass(next);
      updateSettings({ appFullscreen: next });
      return next;
    }
    await syncFromMain();
    return false;
  }, [syncFromMain, updateSettings]);

  useEffect(() => {
    applyFullscreenClass(settings.appFullscreen);
    setIsFullscreen(Boolean(settings.appFullscreen));
  }, [settings.appFullscreen]);

  const bootFullscreenApplied = useRef(false);

  useEffect(() => {
    syncFromMain();
  }, [syncFromMain]);

  useEffect(() => {
    if (bootFullscreenApplied.current || !settings.appFullscreen) return;
    bootFullscreenApplied.current = true;
    setFullscreen(true);
  }, [settings.appFullscreen, setFullscreen]);

  useEffect(() => {
    if (!window.electronAPI?.onFullscreenChanged) return undefined;
    return window.electronAPI.onFullscreenChanged((next) => {
      setIsFullscreen(next);
      applyFullscreenClass(next);
      updateSettings({ appFullscreen: next });
    });
  }, [updateSettings]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || !isFullscreen) return;
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (document.querySelector('.game-context-menu, .modal-overlay, [role="dialog"]')) return;
      event.preventDefault();
      event.stopPropagation();
      setFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isFullscreen, setFullscreen]);

  return { isFullscreen, setFullscreen, toggleFullscreen, syncFromMain };
};

export default useAppFullscreen;
