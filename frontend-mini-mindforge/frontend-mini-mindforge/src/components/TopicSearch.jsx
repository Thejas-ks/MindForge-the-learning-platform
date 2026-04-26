import { useState, useRef, useEffect } from 'react';
import styles from './TopicSearch.module.css';

export default function TopicSearch({ topics, selected, onSelect, onClear }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) { setSuggestions([]); setOpen(false); return; }
    const words = val.toLowerCase().split(/\s+/).filter(Boolean);
    const matched = topics
      .filter(t => words.every(w => t.question.toLowerCase().includes(w)))
      .slice(0, 8);
    setSuggestions(matched);
    setOpen(true);
  };

  const handleSelect = (topic) => {
    onSelect(topic);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={ref}>
      {selected ? (
        <div className={styles.chip}>
          <span className={styles.chipIcon}>📚</span>
          <span className={styles.chipText}>{selected.question}</span>
          <button className={styles.chipRemove} onClick={onClear} title="Remove">✕</button>
        </div>
      ) : (
        <div className={styles.inputWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.input}
            placeholder="Search a topic…"
            value={query}
            onChange={handleInput}
            onFocus={() => query && setOpen(true)}
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); }}>✕</button>
          )}
        </div>
      )}

      {open && suggestions.length > 0 && (
        <ul className={styles.dropdown}>
          {suggestions.map(t => (
            <li key={t.id} className={styles.suggestion} onClick={() => handleSelect(t)}>
              <span className={styles.suggIcon}>📚</span>
              <span className={styles.suggText}>{t.question}</span>
            </li>
          ))}
        </ul>
      )}

      {open && query && suggestions.length === 0 && (
        <div className={styles.noResults}>No matching topics found</div>
      )}
    </div>
  );
}
