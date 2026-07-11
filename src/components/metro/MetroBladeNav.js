import React from 'react';
import './MetroBladeNav.css';

/**
 * Xbox 360 blade sidebar navigation.
 * - mode "blade": green header = active section, grey list = other sections
 * - mode "full": all sections in list, active = green, focus = darker grey
 */
const MetroBladeNav = ({
  items,
  activeIndex,
  focusIndex,
  focused = false,
  mode = 'blade',
  itemRefs,
  onSelect,
  onFocusIndex,
  allowMouseHover
}) => {
  const activeItem = items[activeIndex];

  if (mode === 'full') {
    return (
      <nav className="metro-blade-nav" aria-label="Sections">
        <ul className="metro-blade-nav__list">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            const isFocused = focused && focusIndex === index;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  ref={(n) => {
                    if (itemRefs) itemRefs.current[index] = n;
                  }}
                  className={`metro-blade-nav__item${isActive ? ' is-active' : ''}${isFocused && !isActive ? ' is-focused' : ''}`}
                  onClick={() => onSelect?.(item.id)}
                  onMouseEnter={() => {
                    if (allowMouseHover?.()) onFocusIndex?.(index);
                  }}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  const listEntries = items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => index !== activeIndex);

  return (
    <nav className="metro-blade-nav" aria-label="Sections">
      <div className="metro-blade-nav__header">{activeItem?.label || ''}</div>
      <ul className="metro-blade-nav__list">
        {listEntries.map(({ item, index }, listIdx) => {
          const isFocused = focused && focusIndex === listIdx;
          return (
            <li key={item.id}>
              <button
                type="button"
                ref={(n) => {
                  if (itemRefs) itemRefs.current[listIdx] = n;
                }}
                className={`metro-blade-nav__item${isFocused ? ' is-focused' : ''}`}
                onClick={() => onSelect?.(item.id)}
                onMouseEnter={() => {
                  if (allowMouseHover?.()) onFocusIndex?.(listIdx);
                }}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MetroBladeNav;
