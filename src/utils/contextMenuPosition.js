/** Keep a fixed context menu fully on screen; flip above the cursor when near the bottom. */
export const clampContextMenuPosition = (x, y, menuWidth, menuHeight, padding = 8) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxLeft = Math.max(padding, vw - menuWidth - padding);
  const maxTop = Math.max(padding, vh - menuHeight - padding);

  let left = Math.min(Math.max(padding, x), maxLeft);
  let top = y;

  if (top + menuHeight > vh - padding) {
    top = y - menuHeight;
  }
  if (top < padding) {
    top = padding;
  }
  if (top > maxTop) {
    top = maxTop;
  }

  return { left, top };
};
