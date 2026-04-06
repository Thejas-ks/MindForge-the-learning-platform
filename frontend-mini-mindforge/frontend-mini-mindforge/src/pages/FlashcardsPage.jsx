import { useState } from 'react';
import { generateFlashcards, getFlashcardHistory } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import FlashcardViewer from '../components/FlashcardViewer';
import toast from 'react-hot-toast';
import styles from './FlashcardsPage.module.css';

const COUNT_OPTIONS = [3, 5, 7, 10];

// Group flat flashcard array by questionId into sets
function groupIntoSets(cards) {
  const map = new Map();
  cards.forEach(card => {
    const key = card.questionId ?? 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(card);
  });
  return Array.from(map.entries()).map(([questionId, items], i) => ({
    id: questionId,
    label: `Set ${i + 1}${questionId !== 'unknown' ? ` — Question #${questionId}` : ''}`,
    cards: items,
    count: items.length,
  }));
}

function HistoryAccordion({ sets }) {
  const [openId, setOpenId] = useState(null);

  const toggle = (id) => setOpenId(prev => prev === id ? null : id);

  return (
    <div className={styles.accordion}>
      {sets.map((set) => {
        const isOpen = openId === set.id;
        return (
          <div key={set.id} className={`${styles.accordionItem} ${isOpen ? styles.accordionOpen : ''}`}>
            <button className={styles.accordionHeader} onClick={() => toggle(set.id)}>
              <div className={styles.accordionLeft}>
                <span className={styles.accordionIcon}>🃏</span>
                <div>
                  <p className={styles.accordionTitle}>{set.label}</p>
                  <p className={styles.accordionMeta}>{set.count} card{set.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▼</span>
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
  const [questionId, setQuestionId] = useState('');
  const [count, setCount] = useState(5);
  const [flashcards, setFlashcards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySets, setHistorySets] = useState(null);

  const handleGenerate = async () => {
    if (!questionId.trim()) return toast.error('Enter a Question ID');
    setLoading(true); setFlashcards(null);
    try {
      const res = await generateFlashcards(questionId.trim(), count);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.flashcards || [];
      setFlashcards(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handleHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getFlashcardHistory();
      const all = Array.isArray(res.data) ? res.data : [];
      setHistorySets(groupIntoSets(all));
    } catch {
      toast.error('Failed to load flashcard history');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Flashcards</h1>
        <p className={styles.subtitle}>Generate interactive flashcards from your saved questions</p>

        <Card className={styles.inputCard}>
          <div className={styles.inputRow}>
            <input
              type="number"
              placeholder="Enter Question ID (from Ask Question page)"
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <Button onClick={handleGenerate} disabled={loading || !questionId.trim()}>
              {loading ? 'Generating…' : '🃏 Generate Flashcards'}
            </Button>
          </div>
          <div className={styles.countRow}>
            <span className={styles.countLabel}>Number of cards:</span>
            <div className={styles.countOptions}>
              {COUNT_OPTIONS.map(n => (
                <button key={n} className={`${styles.countBtn} ${count === n ? styles.countActive : ''}`} onClick={() => setCount(n)}>{n}</button>
              ))}
            </div>
          </div>
          <p className={styles.hint}>Ask a question first, then use its ID to generate flashcards</p>
        </Card>

        {loading && <Loader text="Creating flashcards…" />}

        {flashcards && flashcards.length > 0 && (
          <Card>
            <p className={styles.sectionLabel}>Flashcards — {flashcards.length} cards</p>
            <FlashcardViewer cards={flashcards} />
          </Card>
        )}

        {/* History */}
        <div className={styles.historySection}>
          <Button onClick={handleHistory} disabled={historyLoading} variant="secondary">
            {historyLoading ? 'Loading…' : '🕘 View Flashcard History'}
          </Button>
        </div>

        {historyLoading && <Loader text="Loading history…" />}

        {historySets && historySets.length === 0 && (
          <p className={styles.empty}>No flashcard history yet.</p>
        )}

        {historySets && historySets.length > 0 && (
          <div className={styles.historyContainer}>
            <div className={styles.historyHeader}>
              <p className={styles.sectionLabel}>Flashcard History — {historySets.length} set{historySets.length !== 1 ? 's' : ''}</p>
              <button className={styles.closeHistory} onClick={() => setHistorySets(null)}>✕ Close History</button>
            </div>
            <HistoryAccordion sets={historySets} />
          </div>
        )}
      </div>
    </Layout>
  );
}
