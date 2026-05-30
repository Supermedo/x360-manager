/** Default Xenia winkey bindings (keyboard as Xbox 360 pad). Not configurable in Xenia yet. */
export const XENIA_KEYBOARD_DEFAULT_BINDINGS = [
  { action: 'A', keys: "'" },
  { action: 'B', keys: '´ (key next to Enter)' },
  { action: 'X', keys: 'L' },
  { action: 'Y', keys: 'P' },
  { action: 'Start', keys: 'X' },
  { action: 'Back', keys: 'Z' },
  { action: 'LB', keys: '1' },
  { action: 'RB', keys: '3' },
  { action: 'LT', keys: 'Q or I' },
  { action: 'RT', keys: 'E or O' },
  { action: 'Left stick', keys: 'W A S D' },
  { action: 'Right stick', keys: 'Arrow keys' },
  { action: 'L3 (click stick)', keys: 'F' },
  { action: 'R3 (click stick)', keys: 'K' }
];

export const KEYBOARD_MODE_OPTIONS = [
  { value: '0', label: 'Off (controller only)' },
  { value: '1', label: 'Keyboard as gamepad (Xenia defaults)' },
  { value: '2', label: 'Passthrough (game reads keyboard directly)' }
];
