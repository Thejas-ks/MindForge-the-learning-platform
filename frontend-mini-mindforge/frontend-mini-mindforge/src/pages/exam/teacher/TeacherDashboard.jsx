import { useEffect, useState } from 'react';
import { getExams } from '../../../services/api';
import { getErrorMessage } from '../../../utils/errorHandler';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import toast from 'react-hot-toast';
import styles from './TeacherDashboard.module.css';

const STATUS_MAP = {
  PUBLISHED: { label: 'Published', color: '#10b981' },
  DRAFT:     { label: 'Draft',     color: '#f59e0b' },
  ARCHIVED:  { label: 'Archived',  color: '#64748b' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: '#64748b' };
  return (
    <span
      className={styles.badge}
      style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30` }}
    >
      {s.label}
    </span>
  );
}

function ExamRow({ exam }) {
  return (
    <Card className={styles.examCard}>
      <div className={styles.cardTop}>
        <div className={styles.cardMeta}>
          <StatusBadge status={exam.status} />
          <span className={styles.metaChip}>⏱ {exam.durationMinutes} min</span>
          <span className={styles.metaChip}>🎯 {exam.totalMarks} marks</span>
          {exam.maxAttempts != null
            ? <span className={styles.metaChip}>🔁 {exam.maxAttempts} attempt{exam.maxAttempts !== 1 ? 's' : ''}</span>
            : <span className={styles.metaChip}>🔁 Unlimited</span>
          }
        </div>
      </div>

      <h3 className={styles.examTitle}>{exam.title}</h3>

      {exam.description && (
        <p className={styles.examDesc}>{exam.description}</p>
      )}

      <div className={styles.examFooter}>
        <span className={styles.statItem}>
          <span className={styles.statLabel}>Pass marks</span>
          <span className={styles.statValue}>{exam.passMarks}</span>
        </span>
        <span className={styles.statItem}>
          <span className={styles.statLabel}>Created</span>
          <span className={styles.statValue}>{new Date(exam.createdAt).toLocaleDateString()}</span>
        </span>
      </div>
    </Card>
  );
}

export default function TeacherDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getExams()
      .then(res => setExams(Array.isArray(res.data) ? res.data : []))
      .catch(err => {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>My Exams</h1>
            <p className={styles.subtitle}>Manage your examinations</p>
          </div>
        </div>

        {loading && <Loader text="Loading exams…" />}

        {!loading && error && (
          <div className={styles.empty}>
            <span>⚠️</span>
            <p>Failed to load exams.</p>
            <p className={styles.emptyHint}>{error}</p>
          </div>
        )}

        {!loading && !error && exams.length === 0 && (
          <div className={styles.empty}>
            <span>📋</span>
            <p>No exams yet.</p>
            <p className={styles.emptyHint}>Create your first exam to get started.</p>
          </div>
        )}

        {!loading && !error && exams.length > 0 && (
          <div className={styles.grid}>
            {exams.map(exam => (
              <ExamRow key={exam.id} exam={exam} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
