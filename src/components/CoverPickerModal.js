import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, FolderOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { GameContext } from '../context/GameContext';
import { searchAllSources, cleanGameName } from '../services/coverService';

const SOURCE_LABELS = {
  xbox360db: 'Xbox 360 DB',
  screenscraper: 'ScreenScraper',
  steam: 'Steam',
  manual: 'Manual'
};

const SOURCE_COLORS = {
  xbox360db: '#10b981',
  screenscraper: '#7bbf32',
  steam: '#3b82f6',
  manual: '#f59e0b'
};

const CoverPickerModal = ({ game, onClose, onSelect }) => {
  const { xbox360DB } = React.useContext(GameContext);
  const initialQuery = useMemo(() => cleanGameName(game?.name) || game?.name || '', [game]);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);

  const runSearch = async (term, titleId) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const found = await searchAllSources(term, titleId, xbox360DB);
      if (seq !== requestSeq.current) return;
      setResults(found);
      if (!found.length) setError('No matches found. Try a shorter or different name.');
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Cover picker search failed:', err);
      setError('Search failed. Check your internet connection.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!game) return;
    runSearch(initialQuery, game.titleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    runSearch(query.trim(), null);
  };

  const handlePickLocal = async () => {
    if (!window.electronAPI?.selectImageFile) return;
    const file = await window.electronAPI.selectImageFile();
    if (!file) return;
    const url = file.startsWith('http') ? file : `file:///${file.replace(/\\/g, '/')}`;
    onSelect({ coverUrl: url, source: 'manual', title: game.name });
  };

  if (!game) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#10172a',
          border: '1px solid rgba(16, 124, 16, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          width: 'min(960px, 100%)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          color: '#e2e8f0',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#7bbf32', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              Pick Cover
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>{game.name}</h2>
            {game.titleId && (
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Title ID: {game.titleId}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#fff',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a cover..."
              className="form-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
          <button type="button" className="btn btn-secondary" onClick={handlePickLocal}>
            <FolderOpen size={16} />
            Local File
          </button>
        </form>

        {error && (
          <div style={{ color: '#fbbf24', fontSize: '13px' }}>{error}</div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {loading && results.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#94a3b8' }}>
              <Loader2 size={20} style={{ marginRight: 8 }} /> Searching all sources...
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '16px'
              }}
            >
              {results.map((entry, index) => (
                <CoverChoice
                  key={`${entry.source}-${entry.coverUrl}-${index}`}
                  entry={entry}
                  isCurrent={entry.coverUrl === game.coverUrl}
                  onSelect={() => onSelect(entry)}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const CoverChoice = ({ entry, isCurrent, onSelect }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const sourceColor = SOURCE_COLORS[entry.source] || '#7bbf32';
  const sourceLabel = SOURCE_LABELS[entry.source] || entry.source;
  const scorePct = Math.round((entry.score || 0) * 100);

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: 0,
        background: 'transparent',
        border: isCurrent ? '2px solid #10b981' : '2px solid transparent',
        borderRadius: '12px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        if (!isCurrent) e.currentTarget.style.borderColor = 'rgba(16, 124, 16, 0.7)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        if (!isCurrent) e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      <div style={{ aspectRatio: '2 / 3', overflow: 'hidden', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', position: 'relative' }}>
        <img
          src={entry.coverUrl}
          alt={entry.title}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {isCurrent && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: '#10b981', borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, color: '#03150a', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> CURRENT
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.title || 'Untitled'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: sourceColor, padding: '2px 6px', borderRadius: '4px', background: `${sourceColor}22` }}>
            {sourceLabel}
          </span>
          {scorePct > 0 && (
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>match {scorePct}%</span>
          )}
        </div>
      </div>
    </button>
  );
};

export default CoverPickerModal;
