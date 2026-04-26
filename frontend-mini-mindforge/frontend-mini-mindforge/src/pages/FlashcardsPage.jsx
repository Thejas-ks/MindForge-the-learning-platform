import { useState, useEffect } from 'react';
import { generateFlashcards, generateFlashcardsFromTopic, getFlashcardHistory, getHistory, deleteFlashcardByTopic, deleteAllFlashcardHistory } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import FlashcardViewer from '../components/FlashcardViewer';
import TopicSearch from '../components/TopicSearch';
import toast from 'react-hot-toast';
import styles from './FlashcardsPage.module.css';

const COUNT_OPTIONS = [3, 5, 7, 10];

function HistoryAccordion({ sets, onDelete }) {
  const [openId, setOpenId] = useState(null);
  return (
    <div className={styles.accordion}>
      {sets.map(set => {
        const isOpen = openId === set.id;
        return (
          <div key={set.id} className={`${styles.accordionItem} ${isOpen ? styles.accordionOpen : ''}`}>
            <button className={styles.accordionHeader} onClick={() => setOpenId(p => p === set.id ? null : set.id)}>
              <div className={styles.accordionLeft}>
                <span className={styles.accordionIcon}>🃏</span>
                <div>
                  <p className={styles.accordionTitle}>{set.label}</p>
                  <p className={styles.accordionMeta}>{set.count} card{set.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className={styles.accordionRight}>
                <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(set); }} title="Delete">🗑</button>
                <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▼</span>
              </div>
            </button>
            {isOpen && (
              <div className={styles.accordionBody}>
                <FlashcardViewer cards={set.cards} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FlashcardsPage() {
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [customTopic, setCustomTopic] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [count, setCount] = useState(5);
  const [flashcards, setFlashcards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historySets, setHistorySets] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    getHistory()
      .then(res => setTopics(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTopics([]))
      .finally(() => setTopicsLoading(false));
  }, []);

  const activeTopic = useCustom ? customTopic.trim() : selectedTopic?.question || '';
  const canGenerate = useCustom ? customTopic.trim().length > 0 : !!selectedTopic;

  const handleGenerate = async () => {
    if (!canGenerate) return toast.error('Please enter or select a topic');
    setLoading(true); setFlashcards(null);
    try {
      let res;
      if (useCustom) {
        res = await generateFlashcardsFromTopic(customTopic.trim(), count);
      } else {
        res = await generateFlashcards(selectedTopic.id, count);
      }
      setFlashcards(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getFlashcardHistory();
      const all = Array.isArray(res.data) ? res.data : [];
      const map = new Map();
      all.forEach(card => {
        const key = card.questionId ?? 'unknown';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(card);
      });
      const sets = Array.from(map.entries()).map(([qId, items], i) => {
        const topic = topics.find(t => String(t.id) === String(qId));
        return { id: qId, label: topic ? topic.question : `Study Session ${i + 1}`, cards: items, count: items.length };
      });
      setHistorySets(sets);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Flashcards</h1>
        <p className={styles.subtitle}>Generate flashcards from your topics or any custom topic</p>

        <Card className={styles.inputCard}>
          {/* Toggle: existing topic vs custom */}
          <div className={styles.modeToggle}>
            <button className={`${styles.modeBtn} ${!useCustom ? styles.modeBtnActive : ''}`} onClick={() => setUseCustom(false)}>
              📚 My Topics
            </button>
            <button className={`${styles.modeBtn} ${useCustom ? styles.modeBtnActive : ''}`} onClick={() => setUseCustom(true)}>
              ✏️ Custom Topic
            </button>
          </div>

          {useCustom ? (
            <input
              className={styles.customInput}
              placeholder="e.g. React Hooks, OOP in Java, DBMS..."
              value={customTopic}
              onChange={e => setCustomTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            />
          ) : (
            topicsLoading ? (
              <Loader text="Loading your topics…" />
            ) : topics.length === 0 ? (
              <p className={styles.hint}>No topics yet. <button className={styles.switchLink} onClick={() => setUseCustom(true)}>Use a custom topic instead →</button></p>
            ) : (
              <TopicSearch
                topics={topics}
                selected={selectedTopic}
                onSelect={(t) => { setSelectedTopic(t); setFlashcards(null); }}
                onClear={() => setSelectedTopic(null)}
              />
            )
          )}

          <div className={styles.countRow}>
            <span className={styles.countLabel}>Cards:</span>
            <div className={styles.countOptions}>
              {COUNT_OPTIONS.map(n => (
                <button key={n} className={`${styles.countBtn} ${count === n ? styles.countActive : ''}`} onClick={() => setCount(n)}>{n}</button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading || !canGenerate} fullWidth>
            {loading ? 'Generating…' : '🃏 Generate Flashcards'}
          </Button>
        </Card>

        {loading && <Loader text="Creating flashcards…" />}

        {flashcards && flashcards.length > 0 && (
          <Card>
            <div className={styles.quizHeader}>
              <p className={styles.sectionLabel}>Flashcards — {flashcards.length} cards {activeTopic && <span className={styles.topicTag}>{activeTopic}</span>}</p>
              <div className={styles.quizControls}>
                <button className={styles.controlBtn} onClick={handleGenerate} disabled={loading}>🔄 New Set</button>
                <button className={styles.controlBtn} onClick={() => setFlashcards(null)}>✕ Clear</button>
                <button className={styles.controlBtn} onClick={() => { setFlashcards(null); setSelectedTopic(null); setCustomTopic(''); }}>🔀 Change Topic</button>
              </div>
            </div>
            <FlashcardViewer cards={flashcards} />
          </Card>
        )}

        <div className={styles.historySection}>
          <Button onClick={handleHistory} disabled={historyLoading} variant="secondary">
            {historyLoading ? 'Loading…' : '🕘 View Flashcard History'}
          </Button>
        </div>

        {historyLoading && <Loader text="Loading history…" />}
        {historySets && historySets.length === 0 && <p className={styles.empty}>No flashcard history yet.</p>}
        {historySets && historySets.length > 0 && (
          <div className={styles.historyContainer}>
            <div className={styles.historyHeader}>
              <p className={styles.sectionLabel}>Flashcard History — {historySets.length} session{historySets.length !== 1 ? 's' : ''}</p>
              <div className={styles.historyActions}>
                <button className={styles.clearAllBtn} onClick={async () => {
                  if (!window.confirm('Clear all flashcard history?')) return;
                  try { await deleteAllFlashcardHistory(); setHistorySets([]); toast.success('Flashcard history cleared'); }
                  catch (err) { toast.error(getErrorMessage(err)); }
                }}>🗑 Clear All</button>
                <button className={styles.closeHistory} onClick={() => setHistorySets(null)}>✕ Close</button>
              </div>
            </div>
            <HistoryAccordion sets={historySets} onDelete={async (set) => {
              if (!window.confirm(`Delete flashcards for "${set.label}"?`)) return;
              try {
                await deleteFlashcardByTopic(set.id);
                setHistorySets(prev => prev.filter(s => s.id !== set.id));
                toast.success('Deleted');
              } catch (err) { toast.error(getErrorMessage(err)); }
            }} />
          </div>
        )}
      </div>
    </Layout>
  );
}
