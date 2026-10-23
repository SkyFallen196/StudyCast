import type { KeyboardEvent } from 'react';

interface SearchBarProps {
  query: string;
  total: number;
  current: number;
  onQueryChange: (query: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

/** Поиск по транскрипту (FE-027): счётчик «3 из 8», переход кнопками, Enter и Shift+Enter. */
export default function SearchBar({ query, total, current, onQueryChange, onNext, onPrev }: SearchBarProps) {
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) onPrev();
      else onNext();
    } else if (event.key === 'Escape') {
      onQueryChange('');
    }
  }

  const hasQuery = query.trim() !== '';

  return (
    <div className="transcript-search" role="search">
      <label className="visually-hidden" htmlFor="transcript-search">Поиск по транскрипту</label>
      <input
        className="transcript-search__input"
        id="transcript-search"
        type="search"
        placeholder="Найти в транскрипте"
        autoComplete="off"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {hasQuery && (
        <>
          <span className="transcript-search__counter" aria-live="polite">
            {total > 0 ? `${current + 1} из ${total}` : '0 из 0'}
          </span>
          <button className="icon-button" type="button" onClick={onPrev} disabled={total === 0} aria-label="Предыдущее совпадение (Shift+Enter)">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 10 4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="icon-button" type="button" onClick={onNext} disabled={total === 0} aria-label="Следующее совпадение (Enter)">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </>
      )}
    </div>
  );
}
