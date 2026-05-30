import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { getPublicAssetUrl } from '../utils/assetUrl';
import useAppFullscreen from '../hooks/useAppFullscreen';

const TitleBar = () => {
    const [iconSrc, setIconSrc] = useState(getPublicAssetUrl('icon.png'));
    const [appVersion, setAppVersion] = useState('');
    const { isFullscreen, toggleFullscreen } = useAppFullscreen();

    useEffect(() => {
        let cancelled = false;
        const loadIcon = async () => {
            const electronIcon = await window.electronAPI?.getAppIconUrl?.();
            if (!cancelled && electronIcon) {
                setIconSrc(electronIcon);
            }
        };
        loadIcon();
        window.electronAPI?.getAppVersion?.().then((v) => {
            if (!cancelled && v) setAppVersion(v);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="title-bar-host" style={{
            height: '48px',
            background: 'rgba(22, 22, 22, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(16, 124, 16, 0.2)',
            WebkitAppRegion: 'drag',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            width: '100%',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', WebkitAppRegion: 'drag', flex: 1, minWidth: 0 }}>
                <img
                    src={iconSrc}
                    alt="X360 Manager"
                    width={24}
                    height={24}
                    style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0, WebkitAppRegion: 'no-drag' }}
                    onError={() => setIconSrc(getPublicAssetUrl('icon.png'))}
                />
                <span style={{ fontWeight: '700', color: '#7bbf32', fontSize: '15px', letterSpacing: '0.5px' }}>X360 Manager</span>
                {appVersion && (
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#64748b',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)'
                    }}>
                        v{appVersion}
                    </span>
                )}
            </div>
            <button
                type="button"
                className="titlebar-fullscreen-btn"
                title={isFullscreen ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFullscreen();
                }}
                style={{
                    WebkitAppRegion: 'no-drag',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 124, 16, 0.35)',
                    background: 'rgba(16, 124, 16, 0.15)',
                    color: '#9bc848',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginRight: '140px',
                    position: 'relative',
                    zIndex: 10000
                }}
            >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {isFullscreen ? 'Windowed' : 'Fullscreen'}
            </button>
        </div>
    );
};

export default TitleBar;
