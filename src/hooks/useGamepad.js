import { useEffect, useRef, useCallback } from 'react';
import { useGameplay } from '../context/GameplayContext';

const BUTTONS = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  BACK: 8,
  START: 9,
  LS: 10,
  RS: 11,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
  GUIDE: 16
};

const DEADZONE = 0.45;
const REPEAT_DELAY_MS = 140;
const HOLD_REPEAT_MS = 320;

export const useGamepad = (handlers = {}, enabled = true) => {
  const { emulatorBlocksGamepad } = useGameplay();
  const handlersRef = useRef(handlers);
  const lastActionRef = useRef(0);
  const axisStateRef = useRef({ x: 0, y: 0 });
  const heldActionRef = useRef(null);
  const holdStartRef = useRef(0);
  const active = enabled && !emulatorBlocksGamepad;

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const fire = useCallback((action, force = false) => {
    const now = Date.now();
    const held = heldActionRef.current === action;
    const delay = held && now - holdStartRef.current > HOLD_REPEAT_MS
      ? REPEAT_DELAY_MS
      : REPEAT_DELAY_MS;
    if (!force && now - lastActionRef.current < delay) return;
    lastActionRef.current = now;
    handlersRef.current?.[action]?.();
  }, []);

  useEffect(() => {
    if (!active) {
      heldActionRef.current = null;
      axisStateRef.current = { x: 0, y: 0 };
      return undefined;
    }

    let frameId;

    const poll = () => {
      if (!document.hasFocus() || document.hidden) {
        frameId = requestAnimationFrame(poll);
        return;
      }

      const pads = navigator.getGamepads?.() || [];
      const pad = pads.find(Boolean);

      if (pad) {
        const pressed = (index) => pad.buttons[index]?.pressed;

        if (pressed(BUTTONS.A)) fire('confirm');
        if (pressed(BUTTONS.B) || pressed(BUTTONS.BACK)) fire('back');
        if (pressed(BUTTONS.X)) fire('actionX');
        if (pressed(BUTTONS.Y)) fire('actionY');
        if (pressed(BUTTONS.START) || pressed(BUTTONS.GUIDE)) fire('menu');
        if (pressed(BUTTONS.LB)) fire('prevTab');
        if (pressed(BUTTONS.RB)) fire('nextTab');

        const axisX = pad.axes[0] || 0;
        const axisY = pad.axes[1] || 0;
        const prev = axisStateRef.current;

        const navLeft = pressed(BUTTONS.LEFT) || axisX < -DEADZONE;
        const navRight = pressed(BUTTONS.RIGHT) || axisX > DEADZONE;
        const navUp = pressed(BUTTONS.UP) || axisY < -DEADZONE;
        const navDown = pressed(BUTTONS.DOWN) || axisY > DEADZONE;

        const trackHold = (action, active, edge) => {
          if (active) {
            if (edge) {
              heldActionRef.current = action;
              holdStartRef.current = Date.now();
              fire(action, true);
            } else if (heldActionRef.current === action) {
              fire(action);
            }
          } else if (heldActionRef.current === action) {
            heldActionRef.current = null;
          }
        };

        trackHold('left', navLeft, prev.x >= -DEADZONE);
        trackHold('right', navRight, prev.x <= DEADZONE);
        trackHold('up', navUp, prev.y >= -DEADZONE);
        trackHold('down', navDown, prev.y <= DEADZONE);

        axisStateRef.current = { x: axisX, y: axisY };
      }

      frameId = requestAnimationFrame(poll);
    };

    frameId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frameId);
  }, [active, fire]);
};

export default useGamepad;
