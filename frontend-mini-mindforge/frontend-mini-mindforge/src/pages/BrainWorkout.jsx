import { useEffect, useState } from 'react';
import { getWorkoutToday, submitWorkout } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';
import styles from './BrainWorkout.module.css';

const SECTIONS = ['LOGIC', 'APTITUDE', 'CODING'];
const SECTION_ICONS = { LOGIC: '🔷', APTITUDE: '📐', CODING: '💻' };
const DIFF_COLORS = { EASY: '#10b981', MEDIUM: '#f59e0b', HARD: '#ef4444' };

function QuestionItem({ q, locked, onCompleted }) {
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
    if (!selected || locked) return;
    setLoading(true);
    try {
      const res = await submitWorkout({ questionId: q.id, userAnswer: selected });
      const data = res.data;
      setResult(data);
      // If backend says workout is now complete, notify parent immediately
      if (data.workoutCompleted) onCompleted();
    } catch (err) {
      toast.error(getErrorMessage(err));
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
        <span className={styles.diffBadge} style={{ background: `${DIFF_COLORS[q.difficulty] || '#6366f1'}20`, color: DIFF_COLORS[q.difficulty] || '#6366f1' }}>
          {q.difficulty}
        </span>
      </div>
      <p className={styles.questionText}>{q.question}</p>

      <div className={styles.optionsList}>
        {options.map(({ key, value }) => (
          <button
            key={key}
            className={getOptionClass(key)}
            onClick={() => !result && !locked && setSelected(key)}
            disabled={!!result || loading || locked}
          >
            <span className={styles.optionKey}>{key}</span>
            <span>{value}</span>
          </button>
        ))}
      </div>

      {!result && !locked && (
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
            <p className={styles.correctAnswer}><strong>Correct answer:</strong> {result.correctAnswer}</p>
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
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    getWorkoutToday()
      .then((res) => {
        setWorkout(res.data);
        setCompleted(res.data?.completed || false);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleCompleted = () => setCompleted(true);

  const questions = workout?.questions || [];
  const difficulty = workout?.difficulty || 'EASY';
  const message = workout?.message;

  const bySection = (section) =>
    questions.filter((q) => (q.type || '').toUpperCase() === section);

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Brain Workout</h1>
            <p className={styles.subtitle}>Today's daily challenges — sharpen your mind</p>
          </div>
          {difficulty && (
            <span className={styles.diffLevel} style={{ color: DIFF_COLORS[difficulty], background: `${DIFF_COLORS[difficulty]}15` }}>
              {difficulty} Level
            </span>
          )}
        </div>

        {loading && <Loader text="Loading today's workout…" />}

        {/* Completed banner */}
        {!loading && completed && (
          <div className={styles.completedBanner}>
            <span className={styles.completedIcon}>🎉</span>
            <div>
              <p className={styles.completedTitle}>Workout Complete!</p>
              <p className={styles.completedMsg}>{message || "You've completed today's brain workout. Come back tomorrow for new challenges!"}</p>
            </div>
          </div>
        )}

        {!loading && questions.length === 0 && !completed && (
          <div className={styles.empty}>
            <span>🧠</span>
            <p>No workout available today. Check back tomorrow!</p>
          </div>
        )}

        {!loading && SECTIONS.map((section) => {
          const qs = bySection(section);
          if (qs.length === 0) return null;
          return (
            <div key={section} className={`${styles.section} ${completed ? styles.sectionLocked : ''}`}>
              <div className={styles.sectionHeader}>
                <span>{SECTION_ICONS[section]}</span>
                <h2 className={styles.sectionTitle}>{section}</h2>
                <span className={styles.sectionCount}>{qs.length} question{qs.length > 1 ? 's' : ''}</span>
                {completed && <span className={styles.lockedBadge}>🔒 Locked</span>}
              </div>
              <div className={styles.questionList}>
                {qs.map((q) => (
                  <Card key={q.id}>
                    <QuestionItem q={q} locked={completed} onCompleted={handleCompleted} />
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
