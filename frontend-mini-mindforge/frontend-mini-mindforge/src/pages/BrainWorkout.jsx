import { useEffect, useState } from 'react';
import { getWorkoutToday, submitWorkout } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';
import styles from './BrainWorkout.module.css';

const SECTIONS = ['LOGIC', 'APTITUDE', 'CODING'];
const SECTION_ICONS = { LOGIC: '🔷', APTITUDE: '📐', CODING: '💻' };

function QuestionItem({ q }) {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const options = [
    { key: 'A', value: q.optionA },
    { key: 'B', value: q.optionB },
    { key: 'C', value: q.optionC },
    { key: 'D', value: q.optionD },
  ].filter(o => o.value);

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await submitWorkout({ questionId: q.id, userAnswer: selected });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const getOptionClass = (key) => {
    if (!result) return selected === key ? styles.optionSelected : styles.option;
    if (key === result.correctAnswer) return styles.optionCorrect;
    if (key === selected && !result.correct) return styles.optionWrong;
    return styles.option;
  };

  return (
    <div className={styles.questionItem}>
      <div className={styles.questionMeta}>
        <span className={styles.diffBadge}>{q.difficulty}</span>
      </div>
      <p className={styles.questionText}>{q.question}</p>

      {options.length > 0 && (
        <div className={styles.optionsList}>
          {options.map(({ key, value }) => (
            <button
              key={key}
              className={getOptionClass(key)}
              onClick={() => !result && setSelected(key)}
              disabled={!!result || loading}
            >
              <span className={styles.optionKey}>{key}</span>
              <span>{value}</span>
            </button>
          ))}
        </div>
      )}

      {options.length === 0 && !result && (
        <div className={styles.answerRow}>
          <input
            type="text"
            placeholder="Your answer…"
            value={selected || ''}
            onChange={(e) => setSelected(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
          />
        </div>
      )}

      {!result && (
        <div className={styles.submitRow}>
          <Button onClick={handleSubmit} disabled={loading || !selected}>
            {loading ? 'Checking…' : 'Submit'}
          </Button>
        </div>
      )}

      {result && (
        <div className={`${styles.result} ${result.correct ? styles.correct : styles.incorrect}`}>
          <p className={styles.verdict}>{result.correct ? '✅ Correct!' : '❌ Incorrect'}</p>
          {!result.correct && (
            <p className={styles.correctAnswer}>
              <strong>Correct answer:</strong> {result.correctAnswer}
            </p>
          )}
          {result.explanation && <p className={styles.explanation}>{result.explanation}</p>}
          {result.steps && (
            <div className={styles.steps}>
              <p className={styles.stepsLabel}>Steps:</p>
              <p>{result.steps}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BrainWorkout() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkoutToday()
      .then((res) => setQuestions(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load workout'))
      .finally(() => setLoading(false));
  }, []);

  const bySection = (section) =>
    questions.filter((q) => (q.type || '').toUpperCase() === section);

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Brain Workout</h1>
        <p className={styles.subtitle}>Today's daily challenges — sharpen your mind</p>

        {loading && <Loader text="Loading today's workout…" />}

        {!loading && questions.length === 0 && (
          <div className={styles.empty}>
            <span>🧠</span>
            <p>No workout available today. Check back tomorrow!</p>
          </div>
        )}

        {!loading && SECTIONS.map((section) => {
          const qs = bySection(section);
          if (qs.length === 0) return null;
          return (
            <div key={section} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>{SECTION_ICONS[section]}</span>
                <h2 className={styles.sectionTitle}>{section}</h2>
                <span className={styles.sectionCount}>{qs.length} question{qs.length > 1 ? 's' : ''}</span>
              </div>
              <div className={styles.questionList}>
                {qs.map((q) => (
                  <Card key={q.id}>
                    <QuestionItem q={q} />
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {!loading && questions.length > 0 && SECTIONS.every((s) => bySection(s).length === 0) && (
          <div className={styles.questionList}>
            {questions.map((q) => (
              <Card key={q.id}>
                <QuestionItem q={q} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
