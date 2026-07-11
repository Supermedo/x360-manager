import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { getPublicAssetUrl } from '../utils/assetUrl';
import useAppFullscreen from '../hooks/useAppFullscreen';
import useTranslation from '../hooks/useTranslation';

const TitleBar = () => {
    const [iconSrc, setIconSrc] = useState(getPublicAssetUrl('icon.png'));
    const [appVersion, setAppVersion] = useState('');
    const { isFullscreen, toggleFullscreen } = useAppFullscreen();
    const { t } = useTranslation();

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
        <div className="title-bar-host">
            <div className="title-bar-host__brand">
                <img
                    src={iconSrc}
                    alt="X360 Manager"
                    width={24}
                    height={24}
                    className="title-bar-host__icon"
                    onError={() => setIconSrc(getPublicAssetUrl('icon.png'))}
                />
                <span className="title-bar-host__name">X360 Manager</span>
                {appVersion && (
                    <span className="title-bar-host__version">
                        v{appVersion}
                    </span>
                )}
            </div>
            <button
                type="button"
                className="titlebar-fullscreen-btn"
                title={isFullscreen ? t('windowed') : t('fullscreen')}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFullscreen();
                }}
            >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {isFullscreen ? t('windowed') : t('fullscreen')}
            </button>
        </div>
    );
};

export default TitleBar;
