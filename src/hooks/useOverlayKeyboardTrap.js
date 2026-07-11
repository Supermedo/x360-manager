import { useEffect } from 'react';

const BLOCKED_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Enter',
  'Escape',
  'Backspace',
  'Tab'
]);

/** Capture-phase keyboard trap so parent console layers never receive input. */
export const useOverlayKeyboardTrap = (active, onKey) => {
  useEffect(() => {
    if (!active) return undefined;

    const onKeyDown = (event) => {
      if (!BLOCKED_KEYS.has(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      onKey?.(event);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [active, onKey]);
};

export default useOverlayKeyboardTrap;
