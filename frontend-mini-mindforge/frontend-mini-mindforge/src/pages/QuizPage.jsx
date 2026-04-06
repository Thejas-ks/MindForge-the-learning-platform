import { useState } from 'react';
import { generateQuiz, getQuizHistory } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';
import styles from './QuizPage.module.css';

function QuizItem({ q, index }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const opts = q.options
    ? q.options.map((v, j) => ({ key: String.fromCharCode(65 + j), value: v }))
    : ['A', 'B', 'C', 'D'].map(k => ({ key: k, value: q[`option${k}`] })).filter(o => o.value);

  const correct = q.correctAnswer || q.answer;

  const getClass = (key) => {
    if (!revealed) return selected === key ? styles.optionSelected : styles.option;
    if (key === correct) return styles.optionCorrect;
    if (key === selected && key !== correct) return styles.optionWrong;
    return styles.option;
  };

  return (
    <div className={styles.quizItem}>
      <p className={styles.quizQ}><span className={styles.qNum}>Q{index + 1}.</span> {q.question || q.questionText}</p>
      <div className={styles.optionsList}>
        {opts.map(({ key, value }) => (
          <button key={key} className={getClass(key)} onClick={() => !revealed && setSelected(key)} disabled={revealed}>
            <span className={styles.optionKey}>{key}</span>
            <span>{value}</span>
          </button>
        ))}
      </div>
      {!revealed && (
        <Button onClick={() => setRevealed(true)} disabled={!selected} variant="secondary">
          Check Answer
        </Button>
      )}
      {revealed && (
        <div className={selected === correct ? styles.resultCorrect : styles.resultWrong}>
          {selected === correct ? '✅ Correct!' : `❌ Wrong — correct answer is ${correct}`}
          {q.explanation && <p className={styles.explanation}>💡 {q.explanation}</p>}
        </div>
      )}
    </div>
  );
}

function groupByQuestion(items) {
  const map = new Map();
  items.forEach(q => {
    const key = q.questionId ?? 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(q);
  });
  return Array.from(map.entries()).map(([qId, qs], i) => ({
    id: qId,
    label: `Set ${i + 1}${qId !== 'unknown' ? ` — Question #${qId}` : ''}`,
    questions: qs,
  }));
}

function HistoryAccordion({ sets }) {
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
              <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▼</span>
            </button>
            {isOpen && (
              <div className={styles.accordionBody}>
                <div className={styles.quizList}>
                  {set.questions.map((q, i) => <QuizItem key={q.id || i} q={q} index={i} />)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const COUNT_OPTIONS = [3, 5, 7, 10];

export default function QuizPage() {
  const [questionId, setQuestionId] = useState('');
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySets, setHistorySets] = useState(null);

  const handleGenerate = async () => {
    if (!questionId.trim()) return toast.error('Enter a Question ID');
    setLoading(true); setQuiz(null);
    try {
      const res = await generateQuiz(questionId.trim(), count);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.questions || [];
      setQuiz(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getQuizHistory();
      const all = Array.isArray(res.data) ? res.data : [];
      setHistorySets(groupByQuestion(all));
    } catch {
      toast.error('Failed to load quiz history');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Quiz</h1>
        <p className={styles.subtitle}>Generate and take quizzes from your saved questions</p>

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
              {loading ? 'Generating…' : '📝 Generate Quiz'}
            </Button>
          </div>
          <div className={styles.countRow}>
            <span className={styles.countLabel}>Number of questions:</span>
            <div className={styles.countOptions}>
              {COUNT_OPTIONS.map(n => (
                <button key={n} className={`${styles.countBtn} ${count === n ? styles.countActive : ''}`} onClick={() => setCount(n)}>{n}</button>
              ))}
            </div>
          </div>
          <p className={styles.hint}>Ask a question first, then use its ID to generate a quiz</p>
        </Card>

        {loading && <Loader text="Building quiz…" />}

        {quiz && quiz.length > 0 && (
          <Card>
            <p className={styles.sectionLabel}>Quiz — {quiz.length} Questions</p>
            <div className={styles.quizList}>
              {quiz.map((q, i) => <QuizItem key={q.id || i} q={q} index={i} />)}
            </div>
          </Card>
        )}

        <div className={styles.historySection}>
          <Button onClick={handleHistory} disabled={historyLoading} variant="secondary">
            {historyLoading ? 'Loading…' : '🕘 View Quiz History'}
          </Button>
        </div>

        {historyLoading && <Loader text="Loading history…" />}

        {historySets && historySets.length === 0 && (
          <p className={styles.empty}>No quiz history yet.</p>
        )}

        {historySets && historySets.length > 0 && (
          <div className={styles.historyContainer}>
            <div className={styles.historyHeader}>
              <p className={styles.sectionLabel}>Quiz History — {historySets.length} set{historySets.length !== 1 ? 's' : ''}</p>
              <button className={styles.closeHistory} onClick={() => setHistorySets(null)}>✕ Close History</button>
            </div>
            <HistoryAccordion sets={historySets} />
          </div>
        )}
      </div>
    </Layout>
  );
}
