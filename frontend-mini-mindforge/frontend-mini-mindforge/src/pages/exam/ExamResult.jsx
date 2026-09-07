import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getAttemptById } from '../../services/api';
import { getErrorMessage } from '../../utils/errorHandler';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Loader from '../../components/Loader';
import toast from 'react-hot-toast';
import styles from './ExamResult.module.css';

export default function ExamResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  // EvaluationResponse passed via navigation state — has totalMarks
  const evaluation = location.state?.evaluation;

  useEffect(() => {
    getAttemptById(attemptId)
      .then(res => setAttempt(res.data))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <Layout><Loader text="Loading result…" /></Layout>;
  if (!attempt) return <Layout><p className={styles.errorMsg}>Result not found.</p></Layout>;

  const { score, percentage, passed, examTitle, status } = attempt;
  // totalMarks: from EvaluationResponse via location.state (immediate after submission)
  // Fallback on refresh: derive from score + percentage (both present on ExamAttemptResponse)
  const totalMarks = evaluation?.totalMarks
    ?? (score != null && percentage != null && percentage > 0
        ? Math.round(score / (percentage / 100))
        : null);
  const pct = percentage ?? 0;
  const isPassed = passed ?? false;

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Exam Result</h1>
          {examTitle && <p className={styles.subtitle}>{examTitle}</p>}
        </div>

        <Card className={styles.resultCard}>
          {/* Score circle */}
          <div className={styles.scoreSection}>
            <div className={`${styles.scoreCircle} ${isPassed ? styles.scorePass : styles.scoreFail}`}>
              <span className={styles.scoreNum}>{score ?? '—'}</span>
              <span className={styles.scoreDivider}>/ {totalMarks ?? '—'}</span>
            </div>
            <div className={styles.scoreInfo}>
              <p className={`${styles.verdict} ${isPassed ? styles.verdictPass : styles.verdictFail}`}>
                {isPassed ? '🎉 Passed!' : '📚 Not Passed'}
              </p>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${isPassed ? styles.progressPass : styles.progressFail}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p className={styles.pctLabel}>{pct}%</p>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Score</span>
              <span className={styles.statValue}>{score ?? '—'} / {totalMarks ?? '—'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Percentage</span>
              <span className={styles.statValue}>{pct}%</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Status</span>
              <span className={`${styles.statValue} ${isPassed ? styles.passText : styles.failText}`}>
                {isPassed ? 'Passed' : 'Failed'}
              </span>
            </div>
            {status && (
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Attempt status</span>
                <span className={styles.statValue}>{status}</span>
              </div>
            )}
          </div>
        </Card>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate('/exams')}>← Back to Exams</Button>
        </div>
      </div>
    </Layout>
  );
}
