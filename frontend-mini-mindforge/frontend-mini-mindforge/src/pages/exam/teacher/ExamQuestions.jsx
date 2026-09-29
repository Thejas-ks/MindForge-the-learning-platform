import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getExamById,
  getExamQuestions,
  updateExamQuestion,
  removeExamQuestion,
  getQuestionDrafts,
} from '../../../services/api';
import { getErrorMessage } from '../../../utils/errorHandler';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Loader from '../../../components/Loader';
import toast from 'react-hot-toast';
import QuestionBuilder from './QuestionBuilder';
import QuestionBankPicker from './QuestionBankPicker';
import styles from './ExamQuestions.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTIONS = ['GENERAL', 'SECTION_A', 'SECTION_B', 'SECTION_C', 'SECTION_D'];

const DIFFICULTY_COLOR = {
  EASY:   'var(--success)',
  MEDIUM: 'var(--warning)',
  HARD:   'var(--error)',
};

const TYPE_LABEL = { MCQ_SINGLE: 'Single', MCQ_MULTIPLE: 'Multi', TRUE_FALSE: 'T/F' };
const STATUS_COLOR = { PUBLISHED: 'var(--success)', DRAFT: 'var(--warning)', ARCHIVED: 'var(--text-dim)' };

// ─── View modes ───────────────────────────────────────────────────────────────

const VIEW = {
  LIST:    'LIST',
  BUILD:   'BUILD',   // QuestionBuilder
  PICK:    'PICK',    // QuestionBankPicker
};

// ─── Small shared components ──────────────────────────────────────────────────

function Badge({ label, color }) {
  return (
    <span className={styles.badge}
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)`,
               border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {label}
    </span>
  );
}

function Chip({ children }) {
  return <span className={styles.chip}>{children}</span>;
}

// ─── Configure modal ──────────────────────────────────────────────────────────

function ConfigureModal({ eq, onSave, onClose, saving }) {
  const [marksOverride, setMarksOverride] = useState(
    eq.marksOverride != null ? String(eq.marksOverride) : ''
  );
  const [section, setSection] = useState(eq.section ?? 'GENERAL');
  const [mandatory, setMandatory] = useState(eq.mandatory ?? false);
  const [err, setErr] = useState(null);

  const handleSave = () => {
    if (marksOverride !== '' && (isNaN(Number(marksOverride)) || Number(marksOverride) < 1)) {
      setErr('Marks override must be at least 1.');
      return;
    }
    setErr(null);
    onSave({
      marksOverride: marksOverride !== '' ? Number(marksOverride) : null,
      section,
      mandatory,
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Configure Question</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p className={styles.modalSubtitle}>{eq.bankQuestionTitle}</p>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Marks Override <span className={styles.fieldHint}>(leave blank to use default: {eq.effectiveMarks})</span>
          </label>
          <input
            type="number" min={1}
            value={marksOverride}
            onChange={e => setMarksOverride(e.target.value)}
            placeholder={`Default: ${eq.effectiveMarks}`}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Section</label>
          <select value={section} onChange={e => setSection(e.target.value)} className={styles.select}>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className={styles.checkRow}>
          <input
            id="mandatory-toggle"
            type="checkbox"
            checked={mandatory}
            onChange={e => setMandatory(e.target.checked)}
          />
          <label htmlFor="mandatory-toggle" className={styles.fieldLabel}>Mandatory</label>
        </div>

        {err && <p className={styles.formError}>{err}</p>}

        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Draft recovery banner ────────────────────────────────────────────────────

function DraftBanner({ count, onResume, onDismiss }) {
  return (
    <div className={styles.draftBanner}>
      <span className={styles.draftBannerIcon}>📝</span>
      <span className={styles.draftBannerText}>
        You have <strong>{count}</strong> unsaved draft question{count !== 1 ? 's' : ''}.
      </span>
      <div className={styles.draftBannerActions}>
        <Button variant="secondary" onClick={onResume}>Resume Drafts</Button>
        <button className={styles.dismissBtn} onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamQuestions() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [assigned, setAssigned] = useState([]);
  const [loadingExam, setLoadingExam] = useState(true);
  const [loadingAssigned, setLoadingAssigned] = useState(true);

  const [view, setView] = useState(VIEW.LIST);

  const [configuring, setConfiguring] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [removing, setRemoving] = useState(null);

  const isDraft = exam?.status === 'DRAFT';

  const [draftCount, setDraftCount] = useState(0);
  const [draftDismissed, setDraftDismissed] = useState(false);

  // Load exam info
  useEffect(() => {
    getExamById(examId)
      .then(res => setExam(res.data))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingExam(false));
  }, [examId]);

  // Load assigned questions
  const loadAssigned = useCallback(() => {
    setLoadingAssigned(true);
    getExamQuestions(examId)
      .then(res => setAssigned(Array.isArray(res.data) ? res.data : []))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingAssigned(false));
  }, [examId]);

  useEffect(() => { loadAssigned(); }, [loadAssigned]);

  // Check for existing exam-scoped drafts on mount
  useEffect(() => {
    getQuestionDrafts({ examId })
      .then(res => {
        const drafts = Array.isArray(res.data) ? res.data : [];
        setDraftCount(drafts.length);
      })
      .catch(() => {}); // non-critical
  }, [examId]);

  // Remove question
  const handleRemove = async (eq) => {
    if (!window.confirm(`Remove "${eq.bankQuestionTitle}" from this exam?`)) return;
    setRemoving(eq.bankQuestionId);
    try {
      await removeExamQuestion(examId, eq.bankQuestionId);
      toast.success('Question removed.');
      loadAssigned();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemoving(null);
    }
  };

  // Configure (update marksOverride, section, mandatory)
  const handleConfigure = async (data) => {
    setSavingConfig(true);
    try {
      await updateExamQuestion(examId, configuring.id, data);
      toast.success('Question updated.');
      setConfiguring(null);
      loadAssigned();
    } catch (err) {
      const raw = err.response?.data?.message;
      toast.error(raw || getErrorMessage(err));
    } finally {
      setSavingConfig(false);
    }
  };

  // Called when QuestionBuilder or QuestionBankPicker finishes
  const handleWorkflowDone = () => {
    setView(VIEW.LIST);
    loadAssigned();
    // Refresh exam-scoped draft count
    getQuestionDrafts({ examId })
      .then(res => setDraftCount(Array.isArray(res.data) ? res.data.length : 0))
      .catch(() => {});
  };

  const isLoading = loadingExam || loadingAssigned;
  const assignedBankIds = assigned.map(eq => eq.bankQuestionId);

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
              {loadingExam ? 'Loading…' : (exam?.title ?? 'Exam Questions')}
            </h1>
            {exam && (
              <div className={styles.examMeta}>
                <Badge label={exam.status} color={STATUS_COLOR[exam.status] ?? 'var(--text-dim)'} />
                <Chip>⏱ {exam.durationMinutes} min</Chip>
                <Chip>🎯 {exam.totalMarks} marks</Chip>
                <Chip>📋 {assigned.length} question{assigned.length !== 1 ? 's' : ''} assigned</Chip>
              </div>
            )}
          </div>

          {/* Primary action buttons — only shown in LIST view for DRAFT exams */}
          {view === VIEW.LIST && !isLoading && isDraft && (
            <div className={styles.headerActions}>
              <Button variant="secondary" onClick={() => setView(VIEW.PICK)}>
                + Add from Question Bank
              </Button>
              <Button onClick={() => setView(VIEW.BUILD)}>
                + Create Questions
              </Button>
            </div>
          )}
        </div>

        {isLoading && <Loader text="Loading…" />}

        {!isLoading && (
          <>
            {/* Draft recovery banner — only meaningful for DRAFT exams */}
            {isDraft && draftCount > 0 && !draftDismissed && view === VIEW.LIST && (
              <DraftBanner
                count={draftCount}
                onResume={() => setView(VIEW.BUILD)}
                onDismiss={() => setDraftDismissed(true)}
              />
            )}

            {/* ── QuestionBuilder view — DRAFT only ── */}
            {view === VIEW.BUILD && isDraft && (
              <QuestionBuilder
                examId={examId}
                onDone={handleWorkflowDone}
                onCancel={() => setView(VIEW.LIST)}
              />
            )}

            {/* ── QuestionBankPicker view — DRAFT only ── */}
            {view === VIEW.PICK && isDraft && (
              <QuestionBankPicker
                examId={examId}
                alreadyAssignedIds={assignedBankIds}
                onDone={handleWorkflowDone}
                onCancel={() => setView(VIEW.LIST)}
              />
            )}

            {/* ── Assigned Questions list ── */}
            {view === VIEW.LIST && (
              <section className={styles.section}>
                {/* Read-only notice for non-DRAFT exams */}
                {!isDraft && (
                  <div className={styles.readOnlyBanner}>
                    <Badge
                      label={exam.status}
                      color={STATUS_COLOR[exam.status] ?? 'var(--text-dim)'}
                    />
                    <span className={styles.readOnlyText}>
                      This exam is {exam.status.toLowerCase()} and cannot be modified.
                      {exam.status === 'PUBLISHED' && ' Archive it first to make changes.'}
                    </span>
                  </div>
                )}

                <h2 className={styles.sectionTitle}>
                  Assigned Questions
                  <span className={styles.sectionCount}>{assigned.length}</span>
                </h2>

                {assigned.length === 0 ? (
                  <div className={styles.empty}>
                    <span>📋</span>
                    <p>No questions assigned yet.</p>
                    {isDraft && (
                      <>
                        <p className={styles.emptyHint}>
                          Use <strong>+ Create Questions</strong> to author new questions, or{' '}
                          <strong>+ Add from Question Bank</strong> to select existing ones.
                        </p>
                        <div className={styles.emptyActions}>
                          <Button variant="secondary" onClick={() => setView(VIEW.PICK)}>
                            + Add from Question Bank
                          </Button>
                          <Button onClick={() => setView(VIEW.BUILD)}>
                            + Create Questions
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className={styles.assignedList}>
                    {assigned.map(eq => (
                      <Card key={eq.id} className={styles.assignedCard}>
                        <div className={styles.assignedRow}>
                          <div className={styles.assignedOrder}>#{eq.questionOrder}</div>
                          <div className={styles.assignedInfo}>
                            <span className={styles.qTitle}>{eq.bankQuestionTitle}</span>
                            <div className={styles.assignedMeta}>
                              <Badge
                                label={eq.difficulty}
                                color={DIFFICULTY_COLOR[eq.difficulty] ?? 'var(--text-dim)'}
                              />
                              <Chip>{TYPE_LABEL[eq.questionType] ?? eq.questionType}</Chip>
                              <Chip>🎯 {eq.effectiveMarks} mark{eq.effectiveMarks !== 1 ? 's' : ''}</Chip>
                              {eq.marksOverride != null && <Chip>override</Chip>}
                              <Chip>{eq.section}</Chip>
                              {eq.mandatory && <Chip>mandatory</Chip>}
                              {eq.topic && <Chip>📌 {eq.topic}</Chip>}
                            </div>
                          </div>
                          {isDraft && (
                            <div className={styles.assignedActions}>
                              <Button variant="ghost" onClick={() => setConfiguring(eq)}>Configure</Button>
                              <Button
                                variant="danger"
                                onClick={() => handleRemove(eq)}
                                disabled={removing === eq.bankQuestionId}
                              >
                                {removing === eq.bankQuestionId ? '…' : 'Remove'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Configure modal — only for DRAFT exams */}
        {configuring && isDraft && (
          <ConfigureModal
            eq={configuring}
            onSave={handleConfigure}
            onClose={() => setConfiguring(null)}
            saving={savingConfig}
          />
        )}

      </div>
    </Layout>
  );
}
