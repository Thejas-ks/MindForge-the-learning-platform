import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublishedExams, startExam } from '../../services/api';
import { getErrorMessage } from '../../utils/errorHandler';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Loader from '../../components/Loader';
import toast from 'react-hot-toast';
import styles from './ExamList.module.css';

function StatusBadge({ status }) {
  const map = {
    PUBLISHED: { label: 'Published', color: '#10b981' },
    DRAFT:     { label: 'Draft',     color: '#f59e0b' },
  };
  const s = map[status] || { label: status, color: '#64748b' };
  return (
    <span className={styles.badge}
      style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
      {s.label}
    </span>
  );
}

function ExamCard({ exam, onStart, isStarting }) {
  const hasWindow = exam.startTime || exam.endTime;

  return (
    <Card className={styles.examCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardMeta}>
          <StatusBadge status={exam.status} />
          {exam.durationMinutes && (
            <span className={styles.metaChip}>⏱ {exam.durationMinutes} min</span>
          )}
          {exam.totalMarks && (
            <span className={styles.metaChip}>🎯 {exam.totalMarks} marks</span>
          )}
          {exam.maxAttempts && (
            <span className={styles.metaChip}>🔁 {exam.maxAttempts} attempt{exam.maxAttempts !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <h3 className={styles.examTitle}>{exam.title}</h3>

      {exam.description && (
        <p className={styles.examDesc}>{exam.description}</p>
      )}

      <div className={styles.examFooter}>
        <div className={styles.examStats}>
          <span className={styles.statItem}>
            <span className={styles.statLabel}>Pass marks</span>
            <span className={styles.statValue}>{exam.passMarks ?? '—'}</span>
          </span>
          {hasWindow && (
            <span className={styles.statItem}>
              <span className={styles.statLabel}>Available</span>
              <span className={styles.statValue}>
                {exam.startTime
                  ? new Date(exam.startTime).toLocaleDateString()
                  : 'Now'
                }
                {exam.endTime && ` – ${new Date(exam.endTime).toLocaleDateString()}`}
              </span>
            </span>
          )}
        </div>
        <Button onClick={() => onStart(exam)} disabled={isStarting}>
          {isStarting ? 'Starting…' : 'Start Exam →'}
        </Button>
      </div>
    </Card>
  );
}

export default function ExamList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getPublishedExams()
      .then(res => setExams(Array.isArray(res.data) ? res.data : []))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const [startingId, setStartingId] = useState(null);

  const handleStart = async (exam) => {
    if (startingId) return;
    setStartingId(exam.id);
    try {
      const res = await startExam(exam.id);
      navigate(`/attempts/${res.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setStartingId(null);
    }
  };

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Exams</h1>
            <p className={styles.subtitle}>Browse and attempt available examinations</p>
          </div>
        </div>

        {loading && <Loader text="Loading exams…" />}

        {!loading && exams.length === 0 && (
          <div className={styles.empty}>
            <span>📋</span>
            <p>No exams available right now.</p>
            <p className={styles.emptyHint}>Check back later — your teacher may publish one soon.</p>
          </div>
        )}

        {!loading && exams.length > 0 && (
          <div className={styles.grid}>
            {exams.map(exam => (
              <ExamCard key={exam.id} exam={exam} onStart={handleStart} isStarting={startingId === exam.id} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
