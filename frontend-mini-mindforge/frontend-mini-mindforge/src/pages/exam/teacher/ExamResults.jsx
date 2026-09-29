import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamById, getExamAttempts } from '../../../services/api';
import { getErrorMessage } from '../../../utils/errorHandler';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Loader from '../../../components/Loader';
import toast from 'react-hot-toast';
import styles from './ExamResults.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  IN_PROGRESS:   'var(--warning)',
  SUBMITTED:     '#3b82f6',
  AUTO_SUBMITTED:'#8b5cf6',
  EVALUATED:     'var(--success)',
};

const STATUS_LABEL = {
  IN_PROGRESS:    'In Progress',
  SUBMITTED:      'Submitted',
  AUTO_SUBMITTED: 'Auto-submitted',
  EVALUATED:      'Evaluated',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtSeconds(s) {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] ?? 'var(--text-dim)';
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span className={styles.badge}
      style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {label}
    </span>
  );
}

function PassBadge({ passed }) {
  if (passed == null) return <span className={styles.dimText}>—</span>;
  const color = passed ? 'var(--success)' : 'var(--error)';
  return (
    <span className={styles.badge}
      style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {passed ? 'Passed' : 'Failed'}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamResults() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loadingExam, setLoadingExam] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  useEffect(() => {
    getExamById(examId)
      .then(res => setExam(res.data))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingExam(false));
  }, [examId]);

  const loadAttempts = useCallback(() => {
    setLoadingAttempts(true);
    getExamAttempts(examId)
      .then(res => setAttempts(Array.isArray(res.data) ? res.data : []))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingAttempts(false));
  }, [examId]);

  useEffect(() => { loadAttempts(); }, [loadAttempts]);

  const isLoading = loadingExam || loadingAttempts;

  // Summary counts
  const evaluated  = attempts.filter(a => a.status === 'EVALUATED').length;
  const submitted  = attempts.filter(a => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED').length;
  const inProgress = attempts.filter(a => a.status === 'IN_PROGRESS').length;
  const passed     = attempts.filter(a => a.passed === true).length;

  return (
    <Layout>
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <button className={styles.backBtn} onClick={() => navigate('/teacher/exams')}>
              ← Back to Exams
            </button>
            <h1 className={styles.title}>
              {loadingExam ? 'Loading…' : (exam?.title ?? 'Results')}
            </h1>
            {exam && (
              <div className={styles.examMeta}>
                <span className={styles.metaChip}>⏱ {exam.durationMinutes} min</span>
                <span className={styles.metaChip}>🎯 {exam.totalMarks} marks</span>
                <span className={styles.metaChip}>Pass: {exam.passMarks}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={loadAttempts} disabled={loadingAttempts}>
            {loadingAttempts ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        {isLoading && <Loader text="Loading results…" />}

        {!isLoading && (
          <>
            {/* Summary strip */}
            {attempts.length > 0 && (
              <div className={styles.summaryStrip}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryValue}>{attempts.length}</span>
                  <span className={styles.summaryLabel}>Total attempts</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryValue}>{evaluated}</span>
                  <span className={styles.summaryLabel}>Evaluated</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryValue}>{submitted}</span>
                  <span className={styles.summaryLabel}>Awaiting evaluation</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryValue}>{inProgress}</span>
                  <span className={styles.summaryLabel}>In progress</span>
                </div>
                {evaluated > 0 && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryValue} style={{ color: 'var(--success)' }}>
                      {passed}
                    </span>
                    <span className={styles.summaryLabel}>Passed</span>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {attempts.length === 0 && (
              <div className={styles.empty}>
                <span>📊</span>
                <p>No attempts yet.</p>
                <p className={styles.emptyHint}>Students will appear here once they start this exam.</p>
              </div>
            )}

            {/* Attempts list */}
            {attempts.length > 0 && (
              <div className={styles.attemptList}>
                {attempts.map(a => (
                  <Card key={a.id} className={styles.attemptCard}>
                    <div className={styles.attemptRow}>
                      <div className={styles.attemptMain}>
                        <div className={styles.attemptTop}>
                          <span className={styles.studentEmail}>{a.studentEmail}</span>
                          <StatusBadge status={a.status} />
                          <PassBadge passed={a.passed} />
                        </div>
                        <div className={styles.attemptMeta}>
                          <span className={styles.metaItem}>
                            <span className={styles.metaLabel}>Attempt</span>
                            <span className={styles.metaValue}>#{a.attemptNumber}</span>
                          </span>
                          <span className={styles.metaItem}>
                            <span className={styles.metaLabel}>Score</span>
                            <span className={styles.metaValue}>
                              {a.score != null ? `${a.score} / ${exam?.totalMarks ?? '—'}` : '—'}
                            </span>
                          </span>
                          <span className={styles.metaItem}>
                            <span className={styles.metaLabel}>Percentage</span>
                            <span className={styles.metaValue}>
                              {a.percentage != null ? `${a.percentage}%` : '—'}
                            </span>
                          </span>
                          <span className={styles.metaItem}>
                            <span className={styles.metaLabel}>Time taken</span>
                            <span className={styles.metaValue}>{fmtSeconds(a.timeTakenSeconds)}</span>
                          </span>
                          <span className={styles.metaItem}>
                            <span className={styles.metaLabel}>Started</span>
                            <span className={styles.metaValue}>{fmtDate(a.startedAt)}</span>
                          </span>
                          {a.submittedAt && (
                            <span className={styles.metaItem}>
                              <span className={styles.metaLabel}>Submitted</span>
                              <span className={styles.metaValue}>{fmtDate(a.submittedAt)}</span>
                            </span>
                          )}
                          {a.evaluatedAt && (
                            <span className={styles.metaItem}>
                              <span className={styles.metaLabel}>Evaluated</span>
                              <span className={styles.metaValue}>{fmtDate(a.evaluatedAt)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.attemptActions}>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/teacher/attempts/${a.id}`)}
                        >
                          View Attempt
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </Layout>
  );
}
