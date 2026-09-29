import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamPreview, publishExam } from '../../../services/api';
import { getErrorMessage } from '../../../utils/errorHandler';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Loader from '../../../components/Loader';
import toast from 'react-hot-toast';
import styles from './ExamPreview.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFF_COLOR = {
  EASY:   'var(--success)',
  MEDIUM: 'var(--warning)',
  HARD:   'var(--error)',
};

const TYPE_LABEL = {
  MCQ_SINGLE:   'Single Choice',
  MCQ_MULTIPLE: 'Multi Choice',
  TRUE_FALSE:   'True / False',
  SHORT_ANSWER: 'Short Answer',
  LONG_ANSWER:  'Long Answer',
  FILL_BLANK:   'Fill in Blank',
};

// Question types that show selectable options
const HAS_OPTIONS = new Set(['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function fmtDuration(mins) {
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Group questions by section, preserving questionOrder within each group */
function groupBySection(questions) {
  const order = [];
  const map = {};
  for (const q of questions) {
    if (!map[q.section]) {
      map[q.section] = [];
      order.push(q.section);
    }
    map[q.section].push(q);
  }
  return order.map(s => ({ section: s, questions: map[s] }));
}

function sectionLabel(s) {
  if (s === 'GENERAL') return 'General';
  return s.replace('_', ' '); // SECTION_A → Section A
}

// ─── Validation summary ───────────────────────────────────────────────────────

/**
 * Compute validation checks client-side from the preview payload.
 * The backend is the final authority — these are informational only.
 */
function computeValidation(preview) {
  const checks = [];

  // 1. Has questions
  checks.push({
    pass: preview.hasQuestions,
    ok:   `Has ${preview.assignedQuestionCount} question${preview.assignedQuestionCount !== 1 ? 's' : ''}`,
    fail: 'No questions assigned — add at least one question before publishing.',
  });

  // 2. Marks match
  checks.push({
    pass: preview.marksMatch,
    ok:   `Total marks match (${preview.assignedMarksSum} / ${preview.totalMarks})`,
    fail: `Marks mismatch — assigned ${preview.assignedMarksSum}, exam total is ${preview.totalMarks} (difference: ${preview.totalMarks - preview.assignedMarksSum}).`,
  });

  // 3. Pass marks valid (should always be true since backend validates on create/update)
  const passValid = preview.passMarks <= preview.totalMarks;
  checks.push({
    pass: passValid,
    ok:   `Pass marks valid (${preview.passMarks} ≤ ${preview.totalMarks})`,
    fail: `Pass marks (${preview.passMarks}) exceed total marks (${preview.totalMarks}).`,
  });

  // 4. Duration valid
  const durValid = preview.durationMinutes >= 1;
  checks.push({
    pass: durValid,
    ok:   `Duration valid (${fmtDuration(preview.durationMinutes)})`,
    fail: 'Duration must be at least 1 minute.',
  });

  const ready = checks.every(c => c.pass);
  return { checks, ready };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color }) {
  return (
    <span
      className={styles.badge}
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

function Chip({ children }) {
  return <span className={styles.chip}>{children}</span>;
}

function MetaRow({ label, value }) {
  if (value == null) return null;
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

// ─── Option list ──────────────────────────────────────────────────────────────

function OptionList({ options, questionType }) {
  if (!options || options.length === 0) return null;

  const sorted = [...options].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <ul className={styles.optionList}>
      {sorted.map(opt => (
        <li
          key={opt.id}
          className={`${styles.optionItem} ${opt.correct ? styles.optionCorrect : ''}`}
        >
          <span className={styles.optionMark}>
            {opt.correct ? '✓' : '○'}
          </span>
          <span className={styles.optionText}>{opt.optionText}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────

function QuestionCard({ q }) {
  const showOptions = HAS_OPTIONS.has(q.questionType);

  return (
    <Card className={styles.questionCard}>
      <div className={styles.qHeader}>
        <span className={styles.qOrder}>Q{q.questionOrder}</span>
        <div className={styles.qBadges}>
          <Badge
            label={q.difficulty}
            color={DIFF_COLOR[q.difficulty] ?? 'var(--text-dim)'}
          />
          <Chip>{TYPE_LABEL[q.questionType] ?? q.questionType}</Chip>
          <Chip>🎯 {q.effectiveMarks} mark{q.effectiveMarks !== 1 ? 's' : ''}</Chip>
          {q.marksOverride != null && <Chip>override</Chip>}
          {q.mandatory && <Chip>mandatory</Chip>}
          {q.topic && <Chip>📌 {q.topic}</Chip>}
        </div>
      </div>

      <p className={styles.qTitle}>{q.title}</p>
      <p className={styles.qText}>{q.questionText}</p>

      {showOptions && (
        <OptionList options={q.options} questionType={q.questionType} />
      )}

      {!showOptions && (
        <p className={styles.openAnswerHint}>
          {q.questionType === 'SHORT_ANSWER' && 'Students type a short answer.'}
          {q.questionType === 'LONG_ANSWER'  && 'Students type a long answer.'}
          {q.questionType === 'FILL_BLANK'   && 'Students fill in the blank.'}
        </p>
      )}
    </Card>
  );
}

// ─── Validation panel ─────────────────────────────────────────────────────────

function ValidationPanel({ preview, onPublish, publishing }) {
  const { checks, ready } = computeValidation(preview);
  const isDraft = preview.status === 'DRAFT';

  return (
    <Card className={styles.validationCard}>
      <h2 className={styles.validationTitle}>Publish Readiness</h2>

      <ul className={styles.checkList}>
        {checks.map((c, i) => (
          <li key={i} className={`${styles.checkItem} ${c.pass ? styles.checkPass : styles.checkFail}`}>
            <span className={styles.checkIcon}>{c.pass ? '✓' : '✗'}</span>
            <span className={styles.checkMsg}>{c.pass ? c.ok : c.fail}</span>
          </li>
        ))}
      </ul>

      <div className={`${styles.statusBanner} ${ready ? styles.statusReady : styles.statusNotReady}`}>
        {ready
          ? (isDraft ? '✓ Ready to publish' : `Exam is ${preview.status.toLowerCase()}`)
          : '✗ Not ready to publish — fix the issues above'}
      </div>

      {isDraft && ready && (
        <div className={styles.publishAction}>
          <Button onClick={onPublish} disabled={publishing} fullWidth>
            {publishing ? 'Publishing…' : 'Publish Exam'}
          </Button>
          <p className={styles.publishHint}>
            Once published, the exam and its questions will be locked for editing.
            Students will be able to access it according to its schedule.
          </p>
        </div>
      )}

      {!isDraft && (
        <p className={styles.publishHint}>
          This exam is already <strong>{preview.status.toLowerCase()}</strong>.
          Publishing is only available for DRAFT exams.
        </p>
      )}
    </Card>
  );
}

// ─── Marks summary panel ──────────────────────────────────────────────────────

function MarksSummary({ preview }) {
  const diff = preview.totalMarks - preview.assignedMarksSum;
  const matchColor = preview.marksMatch ? 'var(--success)' : 'var(--error)';

  return (
    <Card className={styles.summaryCard}>
      <h2 className={styles.summaryTitle}>Marks Summary</h2>
      <table className={styles.summaryTable}>
        <tbody>
          <tr>
            <td className={styles.summaryLabel}>Exam total marks</td>
            <td className={styles.summaryValue}>{preview.totalMarks}</td>
          </tr>
          <tr>
            <td className={styles.summaryLabel}>Assigned question marks</td>
            <td className={styles.summaryValue}>{preview.assignedMarksSum}</td>
          </tr>
          <tr className={styles.summaryDivider}>
            <td className={styles.summaryLabel}>Difference</td>
            <td className={styles.summaryValue} style={{ color: matchColor }}>
              {diff === 0 ? '0' : diff > 0 ? `+${diff} unassigned` : `${diff} over`}
            </td>
          </tr>
          <tr>
            <td className={styles.summaryLabel}>Pass marks</td>
            <td className={styles.summaryValue}>{preview.passMarks}</td>
          </tr>
          <tr>
            <td className={styles.summaryLabel}>Pass threshold</td>
            <td className={styles.summaryValue}>
              {preview.totalMarks > 0
                ? `${Math.round((preview.passMarks / preview.totalMarks) * 100)}%`
                : '—'}
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamPreview() {
  const { examId } = useParams();
  const navigate   = useNavigate();

  const [preview,    setPreview]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getExamPreview(examId)
      .then(res => setPreview(res.data))
      .catch(err => {
        const msg = err.response?.data?.message || getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [examId]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async () => {
    if (!window.confirm(
      `Publish "${preview?.title}"?\n\nOnce published, the exam and its questions will be locked for editing.`
    )) return;

    setPublishing(true);
    try {
      await publishExam(examId);
      toast.success('Exam published successfully.');
      // Reload preview so the status badge + validation panel update
      load();
    } catch (err) {
      const msg = err.response?.data?.message || getErrorMessage(err);
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  };

  // ─── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout>
        <Loader text="Loading preview…" />
      </Layout>
    );
  }

  if (error || !preview) {
    return (
      <Layout>
        <div className={styles.page}>
          <button className={styles.backBtn} onClick={() => navigate('/teacher/exams')}>
            ← Back to Exams
          </button>
          <div className={styles.errorState}>
            <span>⚠️</span>
            <p>Failed to load exam preview.</p>
            <p className={styles.errorHint}>{error}</p>
            <Button variant="secondary" onClick={load}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const STATUS_COLOR = {
    DRAFT:     '#f59e0b',
    PUBLISHED: '#10b981',
    ARCHIVED:  '#64748b',
  };

  const sections = groupBySection(preview.questions ?? []);

  return (
    <Layout>
      <div className={styles.page}>

        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div>
            <button
              className={styles.backBtn}
              onClick={() => navigate('/teacher/exams')}
            >
              ← Back to Exams
            </button>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Exam Preview</h1>
              <span
                className={styles.statusBadge}
                style={{
                  color: STATUS_COLOR[preview.status] ?? '#64748b',
                  background: `${STATUS_COLOR[preview.status] ?? '#64748b'}18`,
                  border: `1px solid ${STATUS_COLOR[preview.status] ?? '#64748b'}35`,
                }}
              >
                {preview.status}
              </span>
            </div>
          </div>
          {preview.status === 'DRAFT' && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/teacher/exams/${examId}/questions`)}
            >
              ← Edit Questions
            </Button>
          )}
        </div>

        {/* ── Two-column layout on wide screens ── */}
        <div className={styles.layout}>

          {/* LEFT — exam content */}
          <div className={styles.mainCol}>

            {/* Exam info card */}
            <Card className={styles.examInfoCard}>
              <h2 className={styles.examName}>{preview.title}</h2>
              {preview.description && (
                <p className={styles.examDesc}>{preview.description}</p>
              )}
              <div className={styles.metaGrid}>
                <MetaRow label="Duration"      value={fmtDuration(preview.durationMinutes)} />
                <MetaRow label="Total marks"   value={preview.totalMarks} />
                <MetaRow label="Pass marks"    value={preview.passMarks} />
                <MetaRow
                  label="Max attempts"
                  value={preview.maxAttempts != null ? preview.maxAttempts : 'Unlimited'}
                />
                <MetaRow label="Opens"         value={fmtDateTime(preview.startTime)} />
                <MetaRow label="Closes"        value={fmtDateTime(preview.endTime)} />
                <MetaRow label="Questions"     value={preview.assignedQuestionCount} />
              </div>
            </Card>

            {/* Questions by section */}
            {preview.questions.length === 0 ? (
              <div className={styles.emptyQuestions}>
                <span>📋</span>
                <p>No questions assigned yet.</p>
                <p className={styles.emptyHint}>
                  Go back and add questions before publishing.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/teacher/exams/${examId}/questions`)}
                >
                  Add Questions
                </Button>
              </div>
            ) : (
              sections.map(({ section, questions }) => (
                <section key={section} className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    {sectionLabel(section)}
                    <span className={styles.sectionCount}>{questions.length}</span>
                  </h3>
                  <div className={styles.questionList}>
                    {questions.map(q => (
                      <QuestionCard key={q.examQuestionId} q={q} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          {/* RIGHT — sidebar */}
          <aside className={styles.sidebar}>
            <MarksSummary preview={preview} />
            <ValidationPanel
              preview={preview}
              onPublish={handlePublish}
              publishing={publishing}
            />
          </aside>

        </div>
      </div>
    </Layout>
  );
}
