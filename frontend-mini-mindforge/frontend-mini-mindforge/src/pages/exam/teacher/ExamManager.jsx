import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExams, createExam, updateExam, deleteExam, publishExam, archiveExam } from '../../../services/api';
import { getErrorMessage } from '../../../utils/errorHandler';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Loader from '../../../components/Loader';
import toast from 'react-hot-toast';
import styles from './ExamManager.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  PUBLISHED: { label: 'Published', color: '#10b981' },
  DRAFT:     { label: 'Draft',     color: '#f59e0b' },
  ARCHIVED:  { label: 'Archived',  color: '#64748b' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// datetime-local input value ↔ backend LocalDateTime string are the same format
// "2025-09-10T14:00" (input) → "2025-09-10T14:00" (backend accepts without seconds)
// Backend returns "2025-09-10T14:00:00" — slice to 16 chars for the input
function toInputDt(isoStr) {
  if (!isoStr) return '';
  return isoStr.slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

function defaultForm() {
  return {
    title: '',
    description: '',
    durationMinutes: 30,
    totalMarks: 10,
    passMarks: 5,
    maxAttempts: '',       // empty string = null = unlimited
    startTime: '',
    endTime: '',
  };
}

function formFromExam(exam) {
  return {
    title: exam.title ?? '',
    description: exam.description ?? '',
    durationMinutes: exam.durationMinutes ?? 30,
    totalMarks: exam.totalMarks ?? 10,
    passMarks: exam.passMarks ?? 5,
    maxAttempts: exam.maxAttempts != null ? String(exam.maxAttempts) : '',
    startTime: toInputDt(exam.startTime),
    endTime: toInputDt(exam.endTime),
  };
}

function buildPayload(form, statusOverride) {
  const payload = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    durationMinutes: Number(form.durationMinutes),
    totalMarks: Number(form.totalMarks),
    passMarks: Number(form.passMarks),
    maxAttempts: form.maxAttempts !== '' ? Number(form.maxAttempts) : null,
    startTime: form.startTime || null,
    endTime: form.endTime || null,
  };
  if (statusOverride) payload.status = statusOverride;
  return payload;
}

function validateForm(form) {
  if (!form.title.trim())                          return 'Title is required.';
  if (form.title.trim().length > 255)              return 'Title must not exceed 255 characters.';
  if (!form.durationMinutes || Number(form.durationMinutes) < 1)
                                                   return 'Duration must be at least 1 minute.';
  if (!form.totalMarks || Number(form.totalMarks) < 1)
                                                   return 'Total marks must be at least 1.';
  if (!form.passMarks || Number(form.passMarks) < 1)
                                                   return 'Pass marks must be at least 1.';
  if (Number(form.passMarks) > Number(form.totalMarks))
                                                   return 'Pass marks cannot exceed total marks.';
  if (form.maxAttempts !== '' && Number(form.maxAttempts) < 1)
                                                   return 'Max attempts must be at least 1.';
  if (form.startTime && form.endTime && form.endTime <= form.startTime)
                                                   return 'End time must be after start time.';
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: '#64748b' };
  return (
    <span className={styles.badge}
      style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
      {s.label}
    </span>
  );
}

function ExamCard({ exam, onEdit, onDelete, onPublish, onArchive, onPreview, onManageQuestions, onResults, publishing }) {
  const isDraft     = exam.status === 'DRAFT';
  const isPublished = exam.status === 'PUBLISHED';

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  }) : null;

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
        <div className={styles.cardActions}>
          {isDraft && (
            <Button variant="secondary" onClick={() => onPublish(exam)} disabled={publishing === exam.id}>
              {publishing === exam.id ? 'Publishing…' : 'Publish'}
            </Button>
          )}
          {isDraft && (
            <Button variant="ghost" onClick={() => onPreview(exam)}>Preview</Button>
          )}
          {isPublished && (
            <Button variant="ghost" onClick={() => onArchive(exam)} disabled={publishing === exam.id}>
              {publishing === exam.id ? 'Archiving…' : 'Archive'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => onManageQuestions(exam)}>
            {isDraft ? 'Questions' : 'View Questions'}
          </Button>
          <Button variant="ghost" onClick={() => onResults(exam)}>Results</Button>
          {isDraft && (
            <Button variant="ghost" onClick={() => onEdit(exam)}>Edit</Button>
          )}
          <Button variant="danger" onClick={() => onDelete(exam)}>Delete</Button>
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
        {exam.startTime && (
          <span className={styles.statItem}>
            <span className={styles.statLabel}>Opens</span>
            <span className={styles.statValue}>{fmtDate(exam.startTime)}</span>
          </span>
        )}
        {exam.endTime && (
          <span className={styles.statItem}>
            <span className={styles.statLabel}>Closes</span>
            <span className={styles.statValue}>{fmtDate(exam.endTime)}</span>
          </span>
        )}
        <span className={styles.statItem}>
          <span className={styles.statLabel}>Created</span>
          <span className={styles.statValue}>{new Date(exam.createdAt).toLocaleDateString()}</span>
        </span>
      </div>
    </Card>
  );
}

function ExamForm({ editingExam, onSave, onCancel, saving }) {
  const [form, setForm] = useState(editingExam ? formFromExam(editingExam) : defaultForm());
  const [formError, setFormError] = useState(null);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validateForm(form);
    if (err) { setFormError(err); return; }
    setFormError(null);
    // On create: no status in payload → backend defaults to DRAFT
    // On edit: no status in payload → backend keeps existing status (only changes if non-null)
    onSave(buildPayload(form, null));
  };

  return (
    <Card className={styles.formCard}>
      <h3 className={styles.formTitle}>{editingExam ? 'Edit Exam' : 'New Exam'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Title</label>
          <input value={form.title} onChange={set('title')} placeholder="Exam title" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Description <span className={styles.fieldHint}>(optional)</span>
          </label>
          <textarea value={form.description} onChange={set('description')}
            placeholder="Brief description shown to students" rows={2} />
        </div>

        <div className={styles.formRow3}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Duration (minutes)</label>
            <input type="number" min={1} value={form.durationMinutes} onChange={set('durationMinutes')} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Total Marks</label>
            <input type="number" min={1} value={form.totalMarks} onChange={set('totalMarks')} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Pass Marks</label>
            <input type="number" min={1} value={form.passMarks} onChange={set('passMarks')} />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Max Attempts <span className={styles.fieldHint}>(leave blank for unlimited)</span>
            </label>
            <input type="number" min={1} value={form.maxAttempts} onChange={set('maxAttempts')}
              placeholder="Unlimited" />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Opens at <span className={styles.fieldHint}>(optional)</span>
            </label>
            <input type="datetime-local" value={form.startTime} onChange={set('startTime')}
              className={styles.dtInput} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Closes at <span className={styles.fieldHint}>(optional)</span>
            </label>
            <input type="datetime-local" value={form.endTime} onChange={set('endTime')}
              className={styles.dtInput} />
          </div>
        </div>

        {formError && <p className={styles.formError}>{formError}</p>}

        <div className={styles.formFooter}>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingExam ? 'Save Changes' : 'Create Exam'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamManager() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(null); // exam id being published/archived

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getExams()
      .then(res => setExams(Array.isArray(res.data) ? res.data : []))
      .catch(err => {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingExam(null); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openEdit   = (e) => { setEditingExam(e);   setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const closeForm  = ()  => { setShowForm(false); setEditingExam(null); };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editingExam) {
        await updateExam(editingExam.id, payload);
        toast.success('Exam updated.');
      } else {
        await createExam(payload);
        toast.success('Exam created.');
      }
      closeForm();
      load();
    } catch (err) {
      const raw = err.response?.data?.message;
      toast.error(raw || getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exam) => {
    const isDraft = exam.status === 'DRAFT';
    const confirmMsg = isDraft
      ? `Delete "${exam.title}"? This cannot be undone.`
      : `Delete "${exam.title}"?\n\nThis exam is ${exam.status.toLowerCase()} and may have student attempts. Deleting it is permanent and cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteExam(exam.id);
      toast.success('Exam deleted.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Publish: send full exam fields + status: 'PUBLISHED'
  // updateExam only changes status when req.getStatus() != null — so we must include it
  const handlePublish = async (exam) => {
    if (!window.confirm(`Publish this exam?

Once published, the exam and its questions will become locked for editing. Students will be able to access it according to its schedule.`)) return;
    setPublishing(exam.id);
    try {
      await publishExam(exam.id);
      toast.success('Exam published.');
      load();
    } catch (err) {
      const raw = err.response?.data?.message;
      toast.error(raw || getErrorMessage(err));
    } finally {
      setPublishing(null);
    }
  };

  const handleArchive = async (exam) => {
    if (!window.confirm(`Archive "${exam.title}"?

This will make the exam unavailable to students.`)) return;
    setPublishing(exam.id);
    try {
      await archiveExam(exam.id);
      toast.success('Exam archived.');
      load();
    } catch (err) {
      const raw = err.response?.data?.message;
      toast.error(raw || getErrorMessage(err));
    } finally {
      setPublishing(null);
    }
  };

  const counts = {
    draft:     exams.filter(e => e.status === 'DRAFT').length,
    published: exams.filter(e => e.status === 'PUBLISHED').length,
    archived:  exams.filter(e => e.status === 'ARCHIVED').length,
  };

  return (
    <Layout>
      <div className={styles.page}>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>My Exams</h1>
            <p className={styles.subtitle}>
              {loading ? 'Loading…' : (
                <>
                  {exams.length} exam{exams.length !== 1 ? 's' : ''}
                  {exams.length > 0 && (
                    <span className={styles.countRow}>
                      {counts.published > 0 && <span className={styles.countChip} style={{ color: '#10b981' }}>{counts.published} published</span>}
                      {counts.draft > 0     && <span className={styles.countChip} style={{ color: '#f59e0b' }}>{counts.draft} draft</span>}
                      {counts.archived > 0  && <span className={styles.countChip} style={{ color: '#64748b' }}>{counts.archived} archived</span>}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          {!showForm && (
            <Button onClick={openCreate}>+ New Exam</Button>
          )}
        </div>

        {showForm && (
          <div className={styles.formSection}>
            <ExamForm
              editingExam={editingExam}
              onSave={handleSave}
              onCancel={closeForm}
              saving={saving}
            />
          </div>
        )}

        {loading && <Loader text="Loading exams…" />}

        {!loading && error && (
          <div className={styles.empty}>
            <span>⚠️</span>
            <p>Failed to load exams.</p>
            <p className={styles.emptyHint}>{error}</p>
            <Button variant="secondary" onClick={load}>Retry</Button>
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
              <ExamCard
                key={exam.id}
                exam={exam}
                onEdit={openEdit}
                onDelete={handleDelete}
                onPublish={(e) => handlePublish(e)}
                onArchive={(e) => handleArchive(e)}
                onPreview={(e) => navigate(`/teacher/exams/${e.id}/preview`)}
                onManageQuestions={(e) => navigate(`/teacher/exams/${e.id}/questions`)}
                onResults={(e) => navigate(`/teacher/exams/${e.id}/results`)}
                publishing={publishing}
              />
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
