import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeacherAttempt, getTeacherAttemptAnswers } from '../../../services/api';
import { getErrorMessage } from '../../../utils/errorHandler';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Loader from '../../../components/Loader';
import toast from 'react-hot-toast';
import styles from './TeacherAttemptDetail.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  IN_PROGRESS:    'var(--warning)',
  SUBMITTED:      '#3b82f6',
  AUTO_SUBMITTED: '#8b5cf6',
  EVALUATED:      'var(--success)',
};

const STATUS_LABEL = {
  IN_PROGRESS:    'In Progress',
  SUBMITTED:      'Submitted',
  AUTO_SUBMITTED: 'Auto-submitted',
  EVALUATED:      'Evaluated',
};

const TYPE_LABEL = {
  MCQ_SINGLE:   'Single Choice',
  MCQ_MULTIPLE: 'Multi Choice',
  TRUE_FALSE:   'True / False',
  SHORT_ANSWER: 'Short Answer',
  LONG_ANSWER:  'Long Answer',
  FILL_BLANK:   'Fill in the Blank',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtSeconds(s) {
  if (s == null) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] ?? 'var(--text-dim)';
  return (
    <span className={styles.badge}
      style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function AttemptHeader({ attempt }) {
  const timeTaken = fmtSeconds(attempt.timeTakenSeconds);
  const isPassed = attempt.passed;

  return (
    <Card className={styles.headerCard}>
      <div className={styles.headerTop}>
        <div>
          <p className={styles.studentEmail}>{attempt.studentEmail}</p>
          <p className={styles.examTitle}>{attempt.examTitle}</p>
        </div>
        <div className={styles.headerBadges}>
          <StatusBadge status={attempt.status} />
          {isPassed != null && (
            <span className={styles.badge}
              style={{
                color: isPassed ? 'var(--success)' : 'var(--error)',
                background: isPassed ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'color-mix(in srgb, var(--error) 10%, transparent)',
                border: `1px solid ${isPassed ? 'color-mix(in srgb, var(--success) 25%, transparent)' : 'color-mix(in srgb, var(--error) 25%, transparent)'}`,
              }}>
              {isPassed ? 'Passed' : 'Failed'}
            </span>
          )}
        </div>
      </div>

      <div className={styles.headerStats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Attempt</span>
          <span className={styles.statValue}>#{attempt.attemptNumber}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Score</span>
          <span className={styles.statValue}>
            {attempt.score != null
              ? `${attempt.score} / ${attempt.examTotalMarks ?? '—'}`
              : '—'}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Percentage</span>
          <span className={styles.statValue}>
            {attempt.percentage != null ? `${attempt.percentage}%` : '—'}
          </span>
        </div>
        {timeTaken && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Time taken</span>
            <span className={styles.statValue}>{timeTaken}</span>
          </div>
        )}
        {fmtDate(attempt.startedAt) && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Started</span>
            <span className={styles.statValue}>{fmtDate(attempt.startedAt)}</span>
          </div>
        )}
        {fmtDate(attempt.submittedAt) && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Submitted</span>
            <span className={styles.statValue}>{fmtDate(attempt.submittedAt)}</span>
          </div>
        )}
        {fmtDate(attempt.evaluatedAt) && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Evaluated</span>
            <span className={styles.statValue}>{fmtDate(attempt.evaluatedAt)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function OptionRow({ option, isSelected, isCorrect }) {
  let cls = styles.optionRow;
  if (isCorrect) cls += ` ${styles.optionCorrect}`;
  if (isSelected && !isCorrect) cls += ` ${styles.optionWrong}`;
  if (isSelected && isCorrect) cls += ` ${styles.optionSelectedCorrect}`;

  return (
    <div className={cls}>
      <span className={styles.optionMarker}>
        {isSelected && isCorrect  ? '✓' :
         isSelected && !isCorrect ? '✗' :
         isCorrect                ? '✓' : '○'}
      </span>
      <span className={styles.optionText}>{option.optionText}</span>
      {isCorrect  && <span className={styles.optionTag}>correct</span>}
      {isSelected && !isCorrect && <span className={styles.optionTagWrong}>selected</span>}
    </div>
  );
}

function QuestionReview({ review, index }) {
  const isEvaluated = review.isCorrect != null;
  const isCorrect   = review.isCorrect === true;
  const isText      = ['SHORT_ANSWER', 'LONG_ANSWER', 'FILL_BLANK'].includes(review.questionType);

  // Build sets for quick lookup
  const selectedIds = new Set(
    review.selectedOptionId != null
      ? [review.selectedOptionId]
      : (review.selectedOptionIds ?? [])
  );
  const correctIds = new Set(
    (review.options ?? []).filter(o => o.correct).map(o => o.id)
  );

  return (
    <Card className={styles.questionCard}>
      <div className={styles.questionHeader}>
        <div className={styles.questionMeta}>
          <span className={styles.questionNum}>Q{index + 1}</span>
          <span className={styles.questionType}>{TYPE_LABEL[review.questionType] ?? review.questionType}</span>
          <span className={styles.questionMarks}>
            {isEvaluated
              ? `${review.marksAwarded ?? 0} / ${review.effectiveMarks}`
              : `— / ${review.effectiveMarks}`} marks
          </span>
        </div>
        {isEvaluated && (
          <span className={isCorrect ? styles.verdictCorrect : styles.verdictWrong}>
            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </span>
        )}
        {!isEvaluated && review.answered && (
          <span className={styles.verdictPending}>Not evaluated</span>
        )}
      </div>

      <p className={styles.questionText}>{review.questionText}</p>

      {/* Options (MCQ / T-F) */}
      {!isText && review.options?.length > 0 && (
        <div className={styles.optionList}>
          {review.options.map(opt => (
            <OptionRow
              key={opt.id}
              option={opt}
              isSelected={selectedIds.has(opt.id)}
              isCorrect={correctIds.has(opt.id)}
            />
          ))}
        </div>
      )}

      {/* Text answer */}
      {isText && (
        <div className={styles.textAnswerSection}>
          <p className={styles.textAnswerLabel}>Student's answer</p>
          {review.answered && review.textAnswer
            ? <p className={styles.textAnswerValue}>{review.textAnswer}</p>
            : <p className={styles.notAnswered}>Not answered</p>
          }
        </div>
      )}

      {/* Not answered (options) */}
      {!isText && !review.answered && (
        <p className={styles.notAnswered}>Not answered</p>
      )}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeacherAttemptDetail() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingAttempt, setLoadingAttempt] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    getTeacherAttempt(attemptId)
      .then(res => setAttempt(res.data))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingAttempt(false));

    getTeacherAttemptAnswers(attemptId)
      .then(res => setReviews(Array.isArray(res.data) ? res.data : []))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingReviews(false));
  }, [attemptId]);

  const isLoading = loadingAttempt || loadingReviews;

  const backPath = attempt?.examId
    ? `/teacher/exams/${attempt.examId}/results`
    : '/teacher/exams';

  return (
    <Layout>
      <div className={styles.page}>

        <div className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => navigate(backPath)}>
            ← Back to Results
          </button>
          <h1 className={styles.title}>Attempt Review</h1>
        </div>

        {isLoading && <Loader text="Loading attempt…" />}

        {!isLoading && attempt && (
          <>
            <AttemptHeader attempt={attempt} />

            {reviews.length === 0 ? (
              <div className={styles.empty}>
                <span>📝</span>
                <p>No answers recorded for this attempt.</p>
              </div>
            ) : (
              <div className={styles.reviewList}>
                {reviews.map((r, i) => (
                  <QuestionReview key={r.bankQuestionId} review={r} index={i} />
                ))}
              </div>
            )}
          </>
        )}

        {!isLoading && !attempt && (
          <div className={styles.empty}>
            <span>⚠️</span>
            <p>Attempt not found or you do not have access.</p>
            <Button variant="secondary" onClick={() => navigate('/teacher/exams')}>
              Back to Exams
            </Button>
          </div>
        )}

      </div>
    </Layout>
  );
}
