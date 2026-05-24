import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const ModalOverlay = ({
  children,
  onClose,
  className = '',
  closeOnBackdrop = true,
  ariaLabel = 'Dialog'
}) => {
  const panelRef = useRef(null);

  useEffect(() => {
    const previousActive = document.activeElement;

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    const focusTimer = window.setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector?.(
        'input:not([type="hidden"]), textarea, select, button:not([disabled])'
      );
      firstFocusable?.focus?.();
    }, 0);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.clearTimeout(focusTimer);
      if (previousActive && typeof previousActive.focus === 'function') {
        previousActive.focus();
      }
    };
  }, [onClose]);

  const handleBackdropClick = (event) => {
    if (!closeOnBackdrop || !onClose) return;
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className={`profile-pin-overlay modal-overlay${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="modal-overlay__panel"
        style={{ WebkitAppRegion: 'no-drag' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ModalOverlay;
