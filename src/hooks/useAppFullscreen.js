import { useCallback, useContext, useEffect, useState } from 'react';
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
      updateSettings({ appFullscreen: state });
    }
  }, [updateSettings]);

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

  useEffect(() => {
    syncFromMain();
  }, [syncFromMain]);

  useEffect(() => {
    if (!window.electronAPI?.onFullscreenChanged) return undefined;
    return window.electronAPI.onFullscreenChanged((next) => {
      setIsFullscreen(next);
      applyFullscreenClass(next);
      updateSettings({ appFullscreen: next });
    });
  }, [updateSettings]);

  return { isFullscreen, setFullscreen, toggleFullscreen, syncFromMain };
};

export default useAppFullscreen;
