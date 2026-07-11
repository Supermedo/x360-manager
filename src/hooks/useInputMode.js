import { useCallback, useEffect, useState } from 'react';
import { wasRecentGamepadInput } from './useGamepad';

/**
 * Console UI: block mouse-hover focus stealing while using a controller.
 * Mouse click still selects; hover only applies after recent mouse activity.
 */
export const useInputMode = () => {
  const [mouseActive, setMouseActive] = useState(false);

  useEffect(() => {
    let timer = null;
    const onMouseDown = () => setMouseActive(true);
    const onMouseMove = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setMouseActive(true), 40);
    };
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (wasRecentGamepadInput(400)) setMouseActive(false);
    }, 150);
    return () => clearInterval(id);
  }, []);

  const allowMouseHover = useCallback(
    () => mouseActive && !wasRecentGamepadInput(400),
    [mouseActive]
  );

  return { allowMouseHover, mouseActive };
};

export default useInputMode;
