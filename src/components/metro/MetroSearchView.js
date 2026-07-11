import React from 'react';
import { Search } from 'lucide-react';
import CoverImage from '../CoverImage';
import './MetroSearchView.css';

const MetroSearchView = ({
  query,
  onQueryChange,
  results,
  searchFocus,
  resultIndex,
  inputRef,
  tileRefs,
  onActivateResult,
  onCoverFailed,
  onInputFocus
}) => {
  return (
    <div className="metro-search">
      <div className="metro-search__hero">
        <h2 className="metro-search__title">search</h2>
        <p className="metro-search__hint">Search your library for games</p>
        <div className={`metro-search__bar${searchFocus === 'input' ? ' is-focused' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            className="metro-search__input"
            placeholder="Search games…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={onInputFocus}
            spellCheck={false}
            autoComplete="off"
          />
          <Search className="metro-search__icon" size={22} strokeWidth={2} />
        </div>
      </div>

      <div className="metro-search__results">
        {query.trim() && results.length === 0 && (
          <p className="metro-search__empty">No games match &ldquo;{query}&rdquo;</p>
        )}
        {results.length > 0 && (
          <ul className="metro-search__list">
            {results.map((game, index) => (
              <li key={game.id}>
                <button
                  type="button"
                  ref={(n) => { tileRefs.current[index] = n; }}
                  className={`metro-search__result${searchFocus === 'results' && resultIndex === index ? ' is-focused' : ''}`}
                  onClick={() => onActivateResult(index)}
                >
                  <div className="metro-search__result-cover">
                    <CoverImage
                      gameName={game.name}
                      coverUrl={game.coverHttpUrl || game.coverUrl}
                      alt={game.name}
                      placeholderSize={40}
                      onCoverFailed={() => onCoverFailed(game)}
                    />
                  </div>
                  <span className="metro-search__result-name">{game.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MetroSearchView;
