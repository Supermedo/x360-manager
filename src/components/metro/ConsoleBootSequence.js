import React, { useCallback, useEffect, useRef } from 'react';
import useGamepad, { resetGamepadHoldState } from '../../hooks/useGamepad';
import { BOOT_SCREEN_VIDEO, STARTUP_SOUND } from './metroConstants';
import './ConsoleBootSequence.css';

const ConsoleBootSequence = ({ onComplete, onCancel }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
    onComplete?.();
  }, [onComplete]);

  const skip = useCallback(() => {
    const video = videoRef.current;
    if (video) video.pause();
    finish();
  }, [finish]);

  useEffect(() => {
    window.electronAPI?.setFullScreen?.(true);
    window.focus?.();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const tryPlay = () => {
      video.play().catch(() => finish());
    };

    tryPlay();
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);

    return () => {
      video.removeEventListener('ended', finish);
      video.removeEventListener('error', finish);
    };
  }, [finish]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        resetGamepadHoldState();
        onCancel?.();
        return;
      }
      if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel, skip]);

  useGamepad({
    confirm: skip,
    back: () => onCancel?.(),
    menu: skip,
    actionX: skip,
    actionY: skip,
    left: skip,
    right: skip,
    up: skip,
    down: skip
  }, true, 120);

  return (
    <div className="console-boot" role="presentation">
      <audio ref={audioRef} src={STARTUP_SOUND} preload="auto" />
      <video
        ref={videoRef}
        className="console-boot__video"
        src={BOOT_SCREEN_VIDEO}
        playsInline
        muted={false}
      />
    </div>
  );
};

export default ConsoleBootSequence;
