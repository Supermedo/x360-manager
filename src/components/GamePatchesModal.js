import React, { useState, useEffect } from 'react';
import {
    Zap,
    Download,
    X,
    Search,
    Trash2
} from 'lucide-react';

const GamePatchesModal = React.memo(({ game, settings, onClose, updateGame }) => {
    const [availablePatches, setAvailablePatches] = useState([]);
    const [patchFile, setPatchFile] = useState('');
    const [loadingPatches, setLoadingPatches] = useState(false);
    const [manualTitleId, setManualTitleId] = useState(game?.titleId || '');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [allPatchFiles, setAllPatchFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (game?.id && settings?.emulatorPath) {
            const getPatches = async () => {
                setLoadingPatches(true);
                try {
                    const searchId = manualTitleId || game.titleId;
                    const result = await window.electronAPI.getGamePatches({
                        emulatorPath: settings.emulatorPath,
                        titleId: searchId,
                        gamePath: game.path
                    });
                    if (result && result.success) {
                        setAvailablePatches(result.patches || []);
                        setPatchFile(result.patchFile || '');

                        // Auto-save the Title ID if finding patches was successful and we didn't have it
                        const finalTitleId = result.detectedTitleId || manualTitleId;
                        if (finalTitleId && finalTitleId !== game.titleId && updateGame) {
                            updateGame(game.id, { titleId: finalTitleId });
                        }
                    } else {
                        setAvailablePatches([]);
                        setPatchFile('');
                    }
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoadingPatches(false);
                }
            };
            getPatches();

            // Fetch all available patch files so user can select from a dropdown
            const fetchAllFiles = async () => {
                const res = await window.electronAPI.getAllPatchFiles(settings.emulatorPath);
                if (res.success) {
                    setAllPatchFiles(res.files);
                }
            };
            fetchAllFiles();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.id, game?.titleId, game?.path, settings?.emulatorPath, manualTitleId, refreshTrigger]);


    const handleTogglePatch = async (patch) => {
        if (!patchFile || patch.enabledLineIndex === -1) return;

        const newValue = !patch.is_enabled;
        const result = await window.electronAPI.toggleGamePatch({
            patchFile,
            enabledLineIndex: patch.enabledLineIndex,
            newValue
        });

        if (result.success) {
            setAvailablePatches(prev => prev.map(p =>
                p.id === patch.id ? { ...p, is_enabled: newValue } : p
            ));
        } else {
            window.electronAPI.showMessageBox({
                type: 'error',
                title: 'Patch Toggle Failed',
                message: result.error || 'Failed to toggle patch.',
                buttons: ['OK']
            });
        }
    };

    const filteredPatches = availablePatches.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDeletePatchFile = async () => {
        if (!patchFile) return;

        const fileName = patchFile.split(/[\\/]/).pop();
        if (window.confirm(`Are you sure you want to permanently delete the patch file "${fileName}"?\nThis cannot be undone.`)) {
            const result = await window.electronAPI.deletePatchFile(patchFile);
            if (result.success) {
                // Clear the manualTitleId and trigger a refresh
                setManualTitleId('');
                setRefreshTrigger(prev => prev + 1);
                window.electronAPI.showMessageBox({ type: 'info', title: 'Deleted', message: 'Patch file deleted successfully.' });
            } else {
                alert("Failed to delete patch file: " + result.error);
            }
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{ width: '650px', maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom, #1e1e2f, #13131f)', border: '1px solid rgba(139, 92, 246, 0.2)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>
                        <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                            <Zap size={20} style={{ color: '#eab308' }} />
                        </div>
                        Game Patches: <span style={{ color: '#a78bfa' }}>{game.name}</span>
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {patchFile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                                    {patchFile.split(/[\\/]/).pop()}
                                </span>
                                <button
                                    onClick={handleDeletePatchFile}
                                    title="Delete this patch file"
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        borderRadius: '4px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        <button
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex' }}
                            onClick={onClose}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="card-body" style={{ overflowY: 'auto', padding: '20px' }}>
                    {loadingPatches ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            <Zap size={48} style={{ color: '#8b5cf6', marginBottom: '16px', opacity: 0.5, animation: 'pulse 2s infinite' }} />
                            <p>Loading patches...</p>
                        </div>
                    ) : availablePatches.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', padding: '0 12px' }}>
                                <Search size={18} style={{ color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Search patches..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: '#f8fafc', padding: '12px', width: '100%', outline: 'none' }}
                                />
                            </div>

                            {filteredPatches.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                                    <p>No patches match your search.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {filteredPatches.map(patch => (
                                        <div key={patch.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: patch.is_enabled ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                                            padding: '16px',
                                            borderRadius: '8px',
                                            border: `1px solid ${patch.is_enabled ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                                            transition: 'all 0.2s ease'
                                        }}>
                                            <div style={{ flex: 1, paddingRight: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <div style={{ color: patch.is_enabled ? '#fff' : '#e2e8f0', fontSize: '15px', fontWeight: 'bold' }}>{patch.name}</div>
                                                    {patch.author && patch.author !== 'Unknown' && (
                                                        <span style={{ fontSize: '11px', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                                            by {patch.author}
                                                        </span>
                                                    )}
                                                </div>
                                                {patch.desc && (
                                                    <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.4' }}>{patch.desc}</div>
                                                )}
                                            </div>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={patch.is_enabled}
                                                    onChange={() => handleTogglePatch(patch)}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                            <Zap size={48} style={{ color: '#64748b', marginBottom: '16px', opacity: 0.5 }} />
                            <p style={{ color: '#94a3b8', marginBottom: '16px' }}>
                                No patches found for this game {(manualTitleId || game?.titleId) ? `(Title ID: ${manualTitleId || game?.titleId})` : ''}.
                            </p>

                            <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                                <p style={{ color: '#eab308', marginBottom: '12px', fontSize: '14px' }}>
                                    Need to use a different ID or select a patch file directly?
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="Enter Title ID e.g. 4D530A26"
                                        maxLength={8}
                                        defaultValue={manualTitleId || game?.titleId || ''}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setManualTitleId(e.target.value.toUpperCase());
                                            }
                                        }}
                                        onBlur={(e) => {
                                            if (e.target.value) setManualTitleId(e.target.value.toUpperCase());
                                        }}
                                        style={{
                                            padding: '10px 16px',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            background: 'rgba(0,0,0,0.2)',
                                            color: 'white',
                                            textTransform: 'uppercase',
                                            width: '260px',
                                            textAlign: 'center',
                                            fontSize: '15px'
                                        }}
                                    />

                                    {allPatchFiles.length > 0 && (
                                        <div style={{ width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>OR SEARCH COMMUNITY LIST</span>
                                            <div style={{ position: 'relative', width: '100%' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '6px', padding: '0 12px' }}>
                                                    <Search size={16} style={{ color: '#94a3b8' }} />
                                                    <input
                                                        type="text"
                                                        placeholder="Search game title or ID..."
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        style={{ background: 'transparent', border: 'none', color: '#f8fafc', padding: '10px', width: '100%', outline: 'none', fontSize: '14px' }}
                                                    />
                                                </div>

                                                {searchQuery.length > 1 && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0,
                                                        maxHeight: '200px',
                                                        overflowY: 'auto',
                                                        background: '#1a1a2e',
                                                        border: '1px solid rgba(139, 92, 246, 0.4)',
                                                        borderRadius: '0 0 8px 8px',
                                                        zIndex: 10,
                                                        marginTop: '2px',
                                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                                                    }}>
                                                        {allPatchFiles
                                                            .filter(f =>
                                                                f.titleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                f.filename.toLowerCase().includes(searchQuery.toLowerCase())
                                                            )
                                                            .slice(0, 50) // Performance limit
                                                            .map(f => (
                                                                <div
                                                                    key={f.filename}
                                                                    onClick={() => {
                                                                        const match = f.filename.match(/^([A-F0-9]{8})/i);
                                                                        if (match) {
                                                                            setManualTitleId(match[1].toUpperCase());
                                                                            setSearchQuery(''); // Close dropdown
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        padding: '10px 16px',
                                                                        cursor: 'pointer',
                                                                        color: '#e2e8f0',
                                                                        fontSize: '13px',
                                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                        transition: 'background 0.2s'
                                                                    }}
                                                                    onMouseEnter={(e) => e.target.style.background = 'rgba(139, 92, 246, 0.2)'}
                                                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                                >
                                                                    <div style={{ fontWeight: '600' }}>{f.titleName}</div>
                                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{f.filename}</div>
                                                                </div>
                                                            ))
                                                        }
                                                        {allPatchFiles.filter(f => f.titleName.toLowerCase().includes(searchQuery.toLowerCase()) || f.filename.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                                            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No matches found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={() => window.electronAPI.downloadPatches(settings.emulatorPath).then(() => {
                                    window.electronAPI.showMessageBox({ type: 'info', title: 'Patches Downloaded', message: 'Patches have been downloaded successfully. If your game is supported, patches will now appear.', buttons: ['OK'] }).then(() => {
                                        setRefreshTrigger(prev => prev + 1);
                                    });
                                })}
                            >
                                <Download size={16} />
                                Download Community Patches
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default GamePatchesModal;
