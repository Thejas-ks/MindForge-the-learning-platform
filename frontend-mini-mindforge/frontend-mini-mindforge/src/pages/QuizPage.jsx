import { useState, useEffect } from 'react';
import { generateQuiz, generateQuizFromTopic, getQuizHistory, getHistory, deleteQuizByTopic, deleteAllQuizHistory } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import TopicSearch from '../components/TopicSearch';
import toast from 'react-hot-toast';
import styles from './QuizPage.module.css';

// ─── RESULT SYSTEM ────────────────────────────────────────────────────────────

function getPerformanceLabel(pct) {
  if (pct >= 80) return { label: 'Excellent! 🏆', color: '#10b981' };
  if (pct >= 50) return { label: 'Good Job! 👍', color: '#f59e0b' };
  return { label: 'Needs Improvement 📚', color: '#ef4444' };
}

function QuizResult({ quiz }) {
  const total = quiz.length;
  const score = quiz.filter(q => q.userAnswer && q.userAnswer === q.correctAnswer).length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const perf = getPerformanceLabel(pct);
  return (
    <div className={styles.quizResult}>
      <div className={styles.resultSummary}>
        <div className={styles.scoreCircle}>
          <span className={styles.scoreNum}>{score}/{total}</span>
          <span className={styles.scorePct}>{pct}%</span>
        </div>
        <div className={styles.resultInfo}>
          <p className={styles.perfLabel} style={{ color: perf.color }}>{perf.label}</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%`, background: perf.color }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QUIZ ITEM ────────────────────────────────────────────────────────────────

function QuizItem({ q, index, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const opts = ['A', 'B', 'C', 'D'].map(k => ({ key: k, value: q[`option${k}`] })).filter(o => o.value);
  const correct = q.correctAnswer;

  const handleReveal = () => {
    setRevealed(true);
    onAnswer(index, selected, selected === correct);
  };

  const getClass = (key) => {
    if (!revealed) return selected === key ? styles.optionSelected : styles.option;
    if (key === correct) return styles.optionCorrect;
    if (key === selected && key !== correct) return styles.optionWrong;
    return styles.option;
  };

  return (
    <div className={styles.quizItem}>
      <p className={styles.quizQ}>
        <span className={styles.qNum}>Q{index + 1}.</span> {q.question}
        {revealed && <span className={selected === correct ? styles.qCorrect : styles.qWrong}>{selected === correct ? ' ✅' : ' ❌'}</span>}
      </p>
      <div className={styles.optionsList}>
        {opts.map(({ key, value }) => (
          <button key={key} className={getClass(key)} onClick={() => !revealed && setSelected(key)} disabled={revealed}>
            <span className={styles.optionKey}>{key}</span>
            <span>{value}</span>
          </button>
        ))}
      </div>
      {!revealed && <Button onClick={handleReveal} disabled={!selected} variant="secondary">Check Answer</Button>}
      {revealed && (
        <div className={selected === correct ? styles.resultCorrect : styles.resultWrong}>
          {selected === correct ? '✅ Correct!' : `❌ Wrong — correct answer is ${correct}`}
          {q.explanation && (
            <div className={styles.explanationBox}>
              <p className={styles.explanationTitle}>💡 Explanation</p>
              <p className={styles.explanation}>{q.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HISTORY ACCORDION ────────────────────────────────────────────────────────

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
                <span>📝</span>
                <div>
                  <p className={styles.accordionTitle}>{set.label}</p>
                  <p className={styles.accordionMeta}>{set.questions.length} question{set.questions.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className={styles.accordionRight}>
                <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(set); }} title="Delete">🗑</button>
                <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▼</span>
              </div>
            </button>
            {isOpen && (
              <div className={styles.accordionBody}>
                <div className={styles.quizList}>
                  {set.questions.map((q, i) => <QuizItem key={q.id || i} q={q} index={i} onAnswer={() => {}} />)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const COUNT_OPTIONS = [3, 5, 7, 10];

export default function QuizPage() {
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);  // from history
  const [customTopic, setCustomTopic] = useState('');         // free text
  const [useCustom, setUseCustom] = useState(false);
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
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
    setLoading(true); setQuiz(null); setAnswers({});
    try {
      let res;
      if (useCustom) {
        res = await generateQuizFromTopic(customTopic.trim(), count);
      } else {
        res = await generateQuiz(selectedTopic.id, count);
      }
      setQuiz(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (index, userAnswer, isCorrect) => {
    setAnswers(prev => ({ ...prev, [index]: { userAnswer, isCorrect } }));
    if (quiz) setQuiz(prev => prev.map((q, i) => i === index ? { ...q, userAnswer } : q));
  };

  const allAnswered = quiz && Object.keys(answers).length === quiz.length;

  const handleHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getQuizHistory();
      const all = Array.isArray(res.data) ? res.data : [];
      const map = new Map();
      all.forEach(q => {
        const key = q.questionId ?? 'unknown';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(q);
      });
      const sets = Array.from(map.entries()).map(([qId, qs], i) => {
        const topic = topics.find(t => String(t.id) === String(qId));
        return { id: qId, label: topic ? topic.question : `Study Session ${i + 1}`, questions: qs };
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
        <h1 className={styles.title}>Quiz</h1>
        <p className={styles.subtitle}>Generate a quiz from your topics or any custom topic</p>

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
                onSelect={(t) => { setSelectedTopic(t); setQuiz(null); setAnswers({}); }}
                onClear={() => setSelectedTopic(null)}
              />
            )
          )}

          <div className={styles.countRow}>
            <span className={styles.countLabel}>Questions:</span>
            <div className={styles.countOptions}>
              {COUNT_OPTIONS.map(n => (
                <button key={n} className={`${styles.countBtn} ${count === n ? styles.countActive : ''}`} onClick={() => setCount(n)}>{n}</button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading || !canGenerate} fullWidth>
            {loading ? 'Generating…' : '📝 Generate Quiz'}
          </Button>
        </Card>

        {loading && <Loader text="Building quiz…" />}

        {quiz && quiz.length > 0 && (
          <Card>
            {/* Post-generation controls */}
            <div className={styles.quizHeader}>
              <p className={styles.sectionLabel}>Quiz — {quiz.length} Questions {activeTopic && <span className={styles.topicTag}>{activeTopic}</span>}</p>
              <div className={styles.quizControls}>
                <button className={styles.controlBtn} onClick={handleGenerate} disabled={loading} title="Regenerate">🔄 New Quiz</button>
                <button className={styles.controlBtn} onClick={() => { setQuiz(null); setAnswers({}); }} title="Clear">✕ Clear</button>
                <button className={styles.controlBtn} onClick={() => { setQuiz(null); setAnswers({}); setSelectedTopic(null); setCustomTopic(''); }} title="Change topic">🔀 Change Topic</button>
              </div>
            </div>

            <div className={styles.quizList}>
              {quiz.map((q, i) => (
                <QuizItem key={q.id || i} q={q} index={i} onAnswer={handleAnswer} />
              ))}
            </div>

            {allAnswered && <QuizResult quiz={quiz} />}
          </Card>
        )}

        <div className={styles.historySection}>
          <Button onClick={handleHistory} disabled={historyLoading} variant="secondary">
            {historyLoading ? 'Loading…' : '🕘 View Quiz History'}
          </Button>
        </div>

        {historyLoading && <Loader text="Loading history…" />}
        {historySets && historySets.length === 0 && <p className={styles.empty}>No quiz history yet.</p>}
        {historySets && historySets.length > 0 && (
          <div className={styles.historyContainer}>
            <div className={styles.historyHeader}>
              <p className={styles.sectionLabel}>Quiz History — {historySets.length} session{historySets.length !== 1 ? 's' : ''}</p>
              <div className={styles.historyActions}>
                <button className={styles.clearAllBtn} onClick={async () => {
                  if (!window.confirm('Clear all quiz history?')) return;
                  try { await deleteAllQuizHistory(); setHistorySets([]); toast.success('Quiz history cleared'); }
                  catch (err) { toast.error(getErrorMessage(err)); }
                }}>🗑 Clear All</button>
                <button className={styles.closeHistory} onClick={() => setHistorySets(null)}>✕ Close</button>
              </div>
            </div>
            <HistoryAccordion sets={historySets} onDelete={async (set) => {
              if (!window.confirm(`Delete quiz for "${set.label}"?`)) return;
              try {
                await deleteQuizByTopic(set.id);
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
