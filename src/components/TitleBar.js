import React from 'react';

const TitleBar = () => {
    return (
        <div style={{
            height: '48px',
            background: 'rgba(18, 18, 38, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            WebkitAppRegion: 'drag',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            width: '100%',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={process.env.PUBLIC_URL + '/icon.png'} alt="X360 Manager Logo" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
                <span style={{ fontWeight: '700', color: '#8b5cf6', fontSize: '15px', letterSpacing: '0.5px' }}>X360 Manager</span>
            </div>
            {/* 
        Native Windows window controls (minimize/maximize/close) 
        are drawn by Electron over the top right corner here. 
      */}
        </div>
    );
};

export default TitleBar;
