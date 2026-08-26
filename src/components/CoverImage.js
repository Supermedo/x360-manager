import React, { useEffect, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import {
  generatePlaceholderCover,
  normalizeCoverUrl,
  resolveCoverUrlForDisplay
} from '../services/coverService';

const CoverImage = ({
  gameName,
  coverUrl,
  alt,
  className,
  style,
  onCoverFailed,
  showPlaceholderIcon = true,
  placeholderSize = 40
}) => {
  const [displayUrl, setDisplayUrl] = useState(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCover = async () => {
      setHasFailed(false);
      if (!coverUrl) {
        if (!cancelled) setDisplayUrl(null);
        return;
      }

      const normalized = normalizeCoverUrl(coverUrl);
      if (!normalized) {
        if (!cancelled) setDisplayUrl(null);
        return;
      }

      if (normalized.startsWith('data:')) {
        if (!cancelled) setDisplayUrl(normalized);
        return;
      }

      // Everything else (remote and legacy file:// URLs alike) is routed through
      // the main process so the rendered src is always cover-cache://.
      const resolved = await resolveCoverUrlForDisplay(normalized);
      if (cancelled) return;
      if (resolved) {
        setDisplayUrl(resolved);
      } else {
        setDisplayUrl(generatePlaceholderCover(gameName || alt || 'Game'));
      }
    };

    loadCover();
    return () => {
      cancelled = true;
    };
  }, [coverUrl, gameName, alt]);

  const handleError = async () => {
    if (hasFailed) return;
    setHasFailed(true);

    if (onCoverFailed) {
      const replacement = await onCoverFailed();
      if (replacement) {
        const resolved = await resolveCoverUrlForDisplay(replacement);
        if (resolved) {
          setDisplayUrl(resolved);
          setHasFailed(false);
          return;
        }
      }
    }

    setDisplayUrl(generatePlaceholderCover(gameName || alt || 'Game'));
  };

  if (!displayUrl) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
      >
        {showPlaceholderIcon && <Gamepad2 size={placeholderSize} opacity={0.6} />}
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt={alt || gameName || 'Game cover'}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        ...style
      }}
      onError={handleError}
      loading="lazy"
    />
  );
};

export default CoverImage;
