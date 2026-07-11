import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const GameplayContext = createContext({
  emulatorRunning: false,
  emulatorBlocksGamepad: false
});

export const GameplayProvider = ({ children }) => {
  const [emulatorRunning, setEmulatorRunning] = useState(false);
  const [windowFocused, setWindowFocused] = useState(
    typeof document !== 'undefined' ? document.hasFocus() : true
  );

  useEffect(() => {
    const syncSession = async () => {
      const session = await window.electronAPI?.getEmulatorSession?.();
      if (session && typeof session.running === 'boolean') {
        setEmulatorRunning(session.running);
      }
    };
    syncSession();

    const removeListener = window.electronAPI?.onEmulatorSessionChanged?.((payload) => {
      setEmulatorRunning(Boolean(payload?.running));
    });

    const onFocus = () => {
      setWindowFocused(true);
      window.electronAPI?.getEmulatorSession?.().then((session) => {
        if (session && typeof session.running === 'boolean') {
          setEmulatorRunning(session.running);
        }
      });
    };
    const onBlur = () => setWindowFocused(false);
    const onVisibility = () => {
      setWindowFocused(document.hasFocus() && !document.hidden);
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      removeListener?.();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const emulatorBlocksGamepad = emulatorRunning && !windowFocused;

  const value = useMemo(
    () => ({ emulatorRunning, emulatorBlocksGamepad, windowFocused }),
    [emulatorRunning, emulatorBlocksGamepad, windowFocused]
  );

  return (
    <GameplayContext.Provider value={value}>
      {children}
    </GameplayContext.Provider>
  );
};

export const useGameplay = () => useContext(GameplayContext);

export default GameplayContext;
