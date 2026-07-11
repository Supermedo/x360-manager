import { useEffect, useRef } from 'react';
import { useGameplay } from '../context/GameplayContext';

const STD = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  BACK: 8,
  START: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
  GUIDE: 16
};

const STICK_DEADZONE = 0.38;
const STICK_DOMINANCE = 1.4;
const DPAD_STEP_MS = 160;
const STICK_INITIAL_MS = 220;
const STICK_REPEAT_MS = 190;
const STICK_REPEAT_FAST_MS = 130;
const GLOBAL_NAV_MIN_MS = 140;
const FACE_COOLDOWN_MS = 200;

let registrationSeq = 0;
let rafId = null;
let emulatorBlocksGamepad = false;
let lastGamepadInputAt = 0;
let lastKeyboardInputAt = 0;
let lastFaceActionAt = 0;
let activeLayout = null;
const registrations = new Map();

export const wasRecentGamepadInput = (withinMs = 450) =>
  Date.now() - lastGamepadInputAt < withinMs;

export const wasRecentKeyboardInput = (withinMs = 450) =>
  Date.now() - lastKeyboardInputAt < withinMs;

export const markKeyboardInput = () => {
  lastKeyboardInputAt = Date.now();
};

const GAMEPAD_ECHO_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Enter', 'Escape', 'Backspace',
  'a', 'A', 'd', 'D', 'w', 'W', 's', 'S',
  'q', 'Q', 'e', 'E',
  'PageUp', 'PageDown'
]);

/** Windows often sends keyboard events for controller input — ignore those after gamepad use. */
export const isLikelyGamepadEchoKey = (key) => GAMEPAD_ECHO_KEYS.has(key);

export const getActiveGamepadLayout = () => activeLayout?.type || null;

const isPlayStationPad = (pad) => {
  const id = (pad.id || '').toLowerCase();
  return /dualshock|dualsense|playstation|054c|sony|wireless controller|ps[45]/i.test(id);
};

const resolveLayout = (pad) => {
  if (!pad) return null;

  if (!isPlayStationPad(pad)) {
    return {
      type: 'xbox',
      confirm: STD.A,
      back: STD.B,
      actionX: STD.X,
      actionY: STD.Y,
      start: STD.START,
      backAlt: STD.BACK,
      prevTab: STD.LB,
      nextTab: STD.RB
    };
  }

  if (pad.mapping === 'standard') {
    return {
      type: 'playstation',
      confirm: 0,
      back: 1,
      actionX: 2,
      actionY: 3,
      start: STD.START,
      backAlt: STD.BACK,
      prevTab: STD.LB,
      nextTab: STD.RB
    };
  }

  return {
    type: 'playstation-alt',
    confirm: 1,
    back: 2,
    actionX: 0,
    actionY: 3,
    start: STD.START,
    backAlt: STD.BACK,
    prevTab: STD.LB,
    nextTab: STD.RB
  };
};

export const resetGamepadHoldState = () => {
  lastFaceActionAt = 0;
  for (const reg of registrations.values()) {
    reg.heldNavRef.current = null;
    reg.heldAxisRef.current = null;
    reg.axisStateRef.current = { x: 0, y: 0 };
    reg.lastActionAtRef.current = {};
    reg.buttonStateRef.current = {};
    reg.lastNavStepRef.current = 0;
    reg.navHoldStartRef.current = 0;
  }
};

const getActiveRegistration = () => {
  let best = null;
  let bestPriority = -Infinity;
  for (const reg of registrations.values()) {
    if (reg.enabled && reg.priority > bestPriority) {
      bestPriority = reg.priority;
      best = reg;
    }
  }
  return best;
};

const btnEdge = (reg, key, down) => {
  const prev = reg.buttonStateRef.current[key];
  reg.buttonStateRef.current[key] = down;
  return down && !prev;
};

const btnDown = (pad, index, threshold = 0.35) => {
  if (index === undefined || index === null) return false;
  const btn = pad.buttons[index];
  if (!btn) return false;
  return btn.pressed || btn.value > threshold;
};

const btnDownDpad = (pad, index) => btnDown(pad, index, 0.05);

const readDpad = (pad) => {
  let up = btnDownDpad(pad, STD.UP);
  let down = btnDownDpad(pad, STD.DOWN);
  let left = btnDownDpad(pad, STD.LEFT);
  let right = btnDownDpad(pad, STD.RIGHT);

  if (pad.axes.length > 7) {
    const hatX = pad.axes[6];
    const hatY = pad.axes[7];
    if (hatX !== undefined && Math.abs(hatX) > 0.25) {
      if (hatX < -0.25) left = true;
      if (hatX > 0.25) right = true;
    }
    if (hatY !== undefined && Math.abs(hatY) > 0.25) {
      if (hatY < -0.25) up = true;
      if (hatY > 0.25) down = true;
    }
  }

  return { up, down, left, right };
};

const dpadActive = (dpad) => dpad.up || dpad.down || dpad.left || dpad.right;

const resolveStickNav = (axisX, axisY, heldAxis) => {
  const ax = Math.abs(axisX);
  const ay = Math.abs(axisY);
  const idle = ax < STICK_DEADZONE && ay < STICK_DEADZONE;
  if (idle) return { up: false, down: false, left: false, right: false, axis: null };

  if (heldAxis === 'x' && ax >= STICK_DEADZONE) {
    return {
      up: false,
      down: false,
      left: axisX < -STICK_DEADZONE,
      right: axisX > STICK_DEADZONE,
      axis: 'x'
    };
  }
  if (heldAxis === 'y' && ay >= STICK_DEADZONE) {
    return {
      up: axisY < -STICK_DEADZONE,
      down: axisY > STICK_DEADZONE,
      left: false,
      right: false,
      axis: 'y'
    };
  }

  if (ax >= ay * STICK_DOMINANCE) {
    return {
      up: false,
      down: false,
      left: axisX < -STICK_DEADZONE,
      right: axisX > STICK_DEADZONE,
      axis: 'x'
    };
  }
  if (ay >= ax * STICK_DOMINANCE) {
    return {
      up: axisY < -STICK_DEADZONE,
      down: axisY > STICK_DEADZONE,
      left: false,
      right: false,
      axis: 'y'
    };
  }

  return { up: false, down: false, left: false, right: false, axis: heldAxis };
};

const mergeNav = (dpad, axisX, axisY, heldAxis) => {
  if (dpadActive(dpad)) {
    return { ...dpad, axis: null };
  }
  const stick = resolveStickNav(axisX, axisY, heldAxis);
  const { axis, ...nav } = stick;
  return { ...nav, axis };
};

const pickPrimaryNav = (candidates, heldNav) => {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (heldNav) {
    const same = candidates.find((c) => c.action === heldNav);
    if (same) return same;
  }

  const withEdge = candidates.filter((c) => c.edge);
  const pool = withEdge.length > 0 ? withEdge : candidates;
  return pool.sort((a, b) => b.strength - a.strength)[0];
};

const fireNav = (reg, action, isRepeat, fromDpad, strength = 1) => {
  const now = Date.now();

  if (now - reg.lastNavStepRef.current < GLOBAL_NAV_MIN_MS) return;

  if (!isRepeat) {
    const minGap = fromDpad ? DPAD_STEP_MS : STICK_INITIAL_MS;
    if (now - (reg.lastActionAtRef.current.__any__ || 0) < minGap) return;
    reg.lastNavStepRef.current = now;
    reg.heldNavRef.current = action;
    reg.navHoldStartRef.current = now;
    reg.lastActionAtRef.current[action] = now;
    reg.lastActionAtRef.current.__any__ = now;
    lastGamepadInputAt = now;
    reg.handlersRef.current?.[action]?.();
    return;
  }

  if (reg.heldNavRef.current !== action) return;

  const holdMs = now - reg.navHoldStartRef.current;
  const initialWait = fromDpad ? DPAD_STEP_MS : STICK_INITIAL_MS;
  if (holdMs < initialWait) return;

  let repeatGap = fromDpad
    ? DPAD_STEP_MS
    : STICK_REPEAT_MS - Math.min(1, holdMs / 1200) * (STICK_REPEAT_MS - STICK_REPEAT_FAST_MS);

  if (!fromDpad) {
    repeatGap -= Math.max(0, strength - STICK_DEADZONE) * 40;
    repeatGap = Math.max(STICK_REPEAT_FAST_MS, repeatGap);
  }

  if (now - (reg.lastActionAtRef.current[action] || 0) < repeatGap) return;

  reg.lastNavStepRef.current = now;
  reg.lastActionAtRef.current[action] = now;
  reg.lastActionAtRef.current.__any__ = now;
  lastGamepadInputAt = now;
  reg.handlersRef.current?.[action]?.();
};

const processNavigation = (reg, pad) => {
  const axisX = pad.axes[0] || 0;
  const axisY = pad.axes[1] || 0;
  const dpad = readDpad(pad);
  const merged = mergeNav(dpad, axisX, axisY, reg.heldAxisRef.current);
  const nav = {
    left: merged.left,
    right: merged.right,
    up: merged.up,
    down: merged.down
  };

  const dirs = [
    {
      action: 'left',
      active: nav.left,
      fromDpad: dpad.left,
      edge: btnEdge(reg, 'navL', nav.left),
      strength: Math.abs(axisX)
    },
    {
      action: 'right',
      active: nav.right,
      fromDpad: dpad.right,
      edge: btnEdge(reg, 'navR', nav.right),
      strength: Math.abs(axisX)
    },
    {
      action: 'up',
      active: nav.up,
      fromDpad: dpad.up,
      edge: btnEdge(reg, 'navU', nav.up),
      strength: Math.abs(axisY)
    },
    {
      action: 'down',
      active: nav.down,
      fromDpad: dpad.down,
      edge: btnEdge(reg, 'navD', nav.down),
      strength: Math.abs(axisY)
    }
  ];

  const active = dirs.filter((d) => d.active);
  if (active.length === 0) {
    reg.heldNavRef.current = null;
    reg.heldAxisRef.current = null;
    reg.axisStateRef.current = { x: axisX, y: axisY };
    return;
  }

  if (merged.axis) {
    reg.heldAxisRef.current = merged.axis;
  } else if (dpadActive(dpad)) {
    reg.heldAxisRef.current = null;
  }

  const primary = pickPrimaryNav(active, reg.heldNavRef.current);
  if (!primary) {
    reg.axisStateRef.current = { x: axisX, y: axisY };
    return;
  }

  if (primary.edge) {
    fireNav(reg, primary.action, false, primary.fromDpad, primary.strength);
  } else if (reg.heldNavRef.current === primary.action) {
    fireNav(reg, primary.action, true, primary.fromDpad, primary.strength);
  }

  reg.axisStateRef.current = { x: axisX, y: axisY };
};

const pickGamepad = (pads) => {
  const connected = pads.filter(Boolean);
  return connected.length > 0 ? connected[0] : null;
};

const fireAction = (reg, action) => {
  const now = Date.now();
  if (now - lastFaceActionAt < FACE_COOLDOWN_MS) return;
  lastFaceActionAt = now;
  lastGamepadInputAt = now;
  reg.handlersRef.current?.[action]?.();
};

const pollLoop = () => {
  rafId = requestAnimationFrame(pollLoop);

  if (emulatorBlocksGamepad) return;
  if (wasRecentKeyboardInput()) return;

  const reg = getActiveRegistration();
  if (!reg) return;

  const pads = navigator.getGamepads?.() || [];
  const pad = pickGamepad(pads);
  if (!pad) return;

  const layout = resolveLayout(pad);
  activeLayout = layout;

  const faceButtons = [
    { key: 'confirm', action: 'confirm', down: btnDown(pad, layout.confirm) },
    { key: 'back', action: 'back', down: btnDown(pad, layout.back) || btnDown(pad, layout.backAlt) },
    { key: 'actionX', action: 'actionX', down: btnDown(pad, layout.actionX) },
    { key: 'actionY', action: 'actionY', down: btnDown(pad, layout.actionY) },
    { key: 'start', action: 'menu', down: btnDown(pad, layout.start) },
    { key: 'lb', action: 'prevTab', down: btnDown(pad, layout.prevTab) },
    { key: 'rb', action: 'nextTab', down: btnDown(pad, layout.nextTab) }
  ];

  for (const btn of faceButtons) {
    if (btnEdge(reg, btn.key, btn.down)) {
      fireAction(reg, btn.action);
      break;
    }
  }

  btnEdge(reg, 'guide', btnDown(pad, STD.GUIDE));
  processNavigation(reg, pad);
};

const syncPolling = () => {
  const anyActive = [...registrations.values()].some((reg) => reg.enabled);
  if (anyActive && rafId === null) {
    rafId = requestAnimationFrame(pollLoop);
  } else if (!anyActive && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};

const primeGamepad = () => {
  navigator.getGamepads?.();
  syncPolling();
};

export const useGamepad = (handlers = {}, enabled = true, priority = 0) => {
  const { emulatorBlocksGamepad: gameplayBlocked } = useGameplay();
  const idRef = useRef(null);
  const handlersRef = useRef(handlers);
  const axisStateRef = useRef({ x: 0, y: 0 });
  const buttonStateRef = useRef({});
  const lastActionAtRef = useRef({});
  const heldNavRef = useRef(null);
  const heldAxisRef = useRef(null);
  const navHoldStartRef = useRef(0);
  const lastNavStepRef = useRef(0);

  if (idRef.current === null) {
    registrationSeq += 1;
    idRef.current = registrationSeq;
  }

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    emulatorBlocksGamepad = gameplayBlocked;
  }, [gameplayBlocked]);

  useEffect(() => {
    const active = enabled && !gameplayBlocked;
    const id = idRef.current;

    registrations.set(id, {
      id,
      priority,
      enabled: active,
      handlersRef,
      axisStateRef,
      buttonStateRef,
      lastActionAtRef,
      heldNavRef,
      heldAxisRef,
      navHoldStartRef,
      lastNavStepRef
    });

    if (!active) {
      heldNavRef.current = null;
      heldAxisRef.current = null;
      axisStateRef.current = { x: 0, y: 0 };
      buttonStateRef.current = {};
      lastActionAtRef.current = {};
      lastNavStepRef.current = 0;
    }

    syncPolling();

    return () => {
      registrations.delete(id);
      syncPolling();
    };
  }, [enabled, priority, gameplayBlocked]);

  useEffect(() => {
    const wake = () => primeGamepad();
    window.addEventListener('gamepadconnected', wake);
    window.addEventListener('gamepaddisconnected', wake);
    window.addEventListener('pointerdown', wake, { once: false, passive: true });
    window.addEventListener('keydown', wake, { once: false, passive: true });
    primeGamepad();
    return () => {
      window.removeEventListener('gamepadconnected', wake);
      window.removeEventListener('gamepaddisconnected', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);
};

export default useGamepad;
