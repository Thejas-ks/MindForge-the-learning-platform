import { useState, useCallback, useEffect } from 'react';
import {
  bulkCreateAndAssign,
  finalizeAndAssign,
  saveDraftQuestions,
  getQuestionDrafts,
} from '../../../services/api';
import { getErrorMessage } from '../../../utils/errorHandler';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Loader from '../../../components/Loader';
import toast from 'react-hot-toast';
import styles from './QuestionBuilder.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES = ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'];
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const SECTIONS = ['GENERAL', 'SECTION_A', 'SECTION_B', 'SECTION_C', 'SECTION_D'];

const TYPE_LABEL = {
  MCQ_SINGLE:   'Single Choice',
  MCQ_MULTIPLE: 'Multi Choice',
  TRUE_FALSE:   'True / False',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultQuestion() {
  return {
    _id: Math.random().toString(36).slice(2), // local React key only
    draftId: null,   // set when loaded from a saved draft
    title: '',
    questionText: '',
    questionType: 'MCQ_SINGLE',
    difficulty: 'EASY',
    marks: 1,
    topic: '',
    estimatedTimeSeconds: '',
    explanation: '',
    options: [
      { optionText: '', correct: false },
      { optionText: '', correct: false },
    ],
    section: 'GENERAL',
    mandatory: false,
    marksOverride: '',
  };
}

function trueFalseOptions() {
  return [
    { optionText: 'True',  correct: true  },
    { optionText: 'False', correct: false },
  ];
}

/** Build a question state object from a saved draft BankQuestionResponse. */
function questionFromDraft(draft) {
  return {
    _id: Math.random().toString(36).slice(2),
    draftId: draft.id,
    title: draft.title ?? '',
    questionText: draft.questionText ?? '',
    questionType: draft.questionType ?? 'MCQ_SINGLE',
    difficulty: draft.difficulty ?? 'EASY',
    marks: draft.marks ?? 1,
    topic: draft.topic ?? '',
    estimatedTimeSeconds: draft.estimatedTimeSeconds ?? '',
    explanation: draft.explanation ?? '',
    options: draft.options?.length
      ? draft.options.map(o => ({ optionText: o.optionText, correct: !!o.correct }))
      : [{ optionText: '', correct: false }, { optionText: '', correct: false }],
    section: 'GENERAL',
    mandatory: false,
    marksOverride: '',
  };
}

function validateQuestion(q, index) {
  const n = index + 1;
  if (!q.title.trim())        return `Q${n}: Title is required.`;
  if (!q.questionText.trim()) return `Q${n}: Question text is required.`;
  if (!q.marks || Number(q.marks) < 1) return `Q${n}: Marks must be at least 1.`;
  if (q.questionType !== 'TRUE_FALSE') {
    if (q.options.length < 2) return `Q${n}: At least 2 options are required.`;
    if (q.options.some(o => !o.optionText.trim())) return `Q${n}: All option texts must be filled.`;
    const correct = q.options.filter(o => o.correct).length;
    if (q.questionType === 'MCQ_SINGLE' && correct !== 1)
      return `Q${n}: Exactly one correct option required for Single Choice.`;
    if (q.questionType === 'MCQ_MULTIPLE' && correct < 1)
      return `Q${n}: At least one correct option required for Multi Choice.`;
  }
  return null;
}

function buildEntry(q) {
  const isTF = q.questionType === 'TRUE_FALSE';
  return {
    draftId: q.draftId ?? null,
    title: q.title.trim(),
    questionText: q.questionText.trim(),
    questionType: q.questionType,
    difficulty: q.difficulty,
    marks: Number(q.marks),
    topic: q.topic.trim() || null,
    estimatedTimeSeconds: q.estimatedTimeSeconds !== '' ? Number(q.estimatedTimeSeconds) : null,
    explanation: q.explanation.trim() || null,
    options: isTF
      ? trueFalseOptions().map((o, i) => ({ ...o, displayOrder: i }))
      : q.options.map((o, i) => ({
          optionText: o.optionText.trim(),
          correct: !!o.correct,
          displayOrder: i,
        })),
    section: q.section,
    mandatory: q.mandatory,
    marksOverride: q.marksOverride !== '' && Number(q.marksOverride) >= 1
      ? Number(q.marksOverride) : null,
  };
}

// ─── OptionsEditor ────────────────────────────────────────────────────────────

function OptionsEditor({ q, onChange }) {
  if (q.questionType === 'TRUE_FALSE') {
    return (
      <div className={styles.tfNote}>
        True / False — options are fixed: <strong>True</strong> (correct) and <strong>False</strong>.
      </div>
    );
  }

  const setOptionText = (i, val) => {
    const opts = [...q.options];
    opts[i] = { ...opts[i], optionText: val };
    onChange({ options: opts });
  };

  const setCorrect = (i) => {
    const opts = q.options.map((o, idx) =>
      q.questionType === 'MCQ_SINGLE'
        ? { ...o, correct: idx === i }
        : { ...o, correct: idx === i ? !o.correct : o.correct }
    );
    onChange({ options: opts });
  };

  const addOption = () =>
    onChange({ options: [...q.options, { optionText: '', correct: false }] });

  const removeOption = (i) =>
    onChange({ options: q.options.filter((_, idx) => idx !== i) });

  return (
    <div className={styles.optionsEditor}>
      <div className={styles.optionsHeader}>
        <span className={styles.fieldLabel}>
          Options
          <span className={styles.fieldHint}>
            {q.questionType === 'MCQ_SINGLE' ? ' — one correct' : ' — one or more correct'}
          </span>
        </span>
        <button type="button" className={styles.addOptionBtn} onClick={addOption}>+ Add option</button>
      </div>
      {q.options.map((opt, i) => (
        <div key={i} className={styles.optionRow}>
          <button
            type="button"
            className={`${styles.correctToggle} ${opt.correct ? styles.correctActive : ''}`}
            onClick={() => setCorrect(i)}
            title="Mark as correct"
          >
            {opt.correct ? '✓' : '○'}
          </button>
          <input
            className={styles.optionInput}
            value={opt.optionText}
            onChange={e => setOptionText(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
          />
          {q.options.length > 2 && (
            <button type="button" className={styles.removeOptionBtn} onClick={() => removeOption(i)}>✕</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── SingleQuestionEditor ─────────────────────────────────────────────────────

function SingleQuestionEditor({ q, index, onChange, onRemove, canRemove }) {
  const set = (field, val) => onChange({ [field]: val });

  const handleTypeChange = (newType) => {
    onChange({
      questionType: newType,
      options: newType === 'TRUE_FALSE' ? trueFalseOptions() : defaultQuestion().options,
    });
  };

  return (
    <Card className={styles.editorCard}>
      <div className={styles.editorHeader}>
        <span className={styles.editorNum}>
          Question {index + 1}
          {q.draftId && <span className={styles.draftTag}>draft</span>}
        </span>
        {canRemove && (
          <button type="button" className={styles.removeQBtn} onClick={onRemove}>
            ✕ Remove
          </button>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Title</label>
        <input value={q.title} onChange={e => set('title', e.target.value)}
          placeholder="Short descriptive title" />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Question Text</label>
        <textarea value={q.questionText} onChange={e => set('questionText', e.target.value)}
          placeholder="The full question shown to students" rows={2} />
      </div>

      <div className={styles.row3}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Type</label>
          <select value={q.questionType} onChange={e => handleTypeChange(e.target.value)} className={styles.select}>
            {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Difficulty</label>
          <select value={q.difficulty} onChange={e => set('difficulty', e.target.value)} className={styles.select}>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Marks</label>
          <input type="number" min={1} value={q.marks} onChange={e => set('marks', e.target.value)} />
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Topic <span className={styles.fieldHint}>(optional)</span></label>
          <input value={q.topic} onChange={e => set('topic', e.target.value)} placeholder="e.g. Java, Algorithms" />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Est. Time (s) <span className={styles.fieldHint}>(optional)</span></label>
          <input type="number" min={1} value={q.estimatedTimeSeconds}
            onChange={e => set('estimatedTimeSeconds', e.target.value)} placeholder="e.g. 60" />
        </div>
      </div>

      <OptionsEditor q={q} onChange={onChange} />

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Explanation <span className={styles.fieldHint}>(optional)</span></label>
        <textarea value={q.explanation} onChange={e => set('explanation', e.target.value)}
          placeholder="Shown after evaluation" rows={2} />
      </div>

      <div className={styles.examConfig}>
        <div className={styles.examConfigTitle}>Exam Configuration</div>
        <div className={styles.row3}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Section</label>
            <select value={q.section} onChange={e => set('section', e.target.value)} className={styles.select}>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Marks Override <span className={styles.fieldHint}>(optional)</span></label>
            <input type="number" min={1} value={q.marksOverride}
              onChange={e => set('marksOverride', e.target.value)} placeholder={`Default: ${q.marks || 1}`} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Mandatory</label>
            <div className={styles.checkRow}>
              <input id={`mandatory-${q._id}`} type="checkbox" checked={q.mandatory}
                onChange={e => set('mandatory', e.target.checked)} />
              <label htmlFor={`mandatory-${q._id}`} className={styles.checkLabel}>Yes</label>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── QuestionBuilder (main export) ───────────────────────────────────────────

export default function QuestionBuilder({ examId, onDone, onCancel }) {
  const [questions, setQuestions] = useState([defaultQuestion()]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  // true if the current session was loaded from existing drafts
  const [isResume, setIsResume] = useState(false);

  // On mount: load any existing exam-scoped drafts
  useEffect(() => {
    getQuestionDrafts({ examId })
      .then(res => {
        const drafts = Array.isArray(res.data) ? res.data : [];
        if (drafts.length > 0) {
          setQuestions(drafts.map(questionFromDraft));
          setIsResume(true);
        }
        // else keep the single blank default question
      })
      .catch(() => {
        // non-critical — start fresh if drafts can't be loaded
      })
      .finally(() => setLoadingDrafts(false));
  }, [examId]);

  const updateQuestion = useCallback((index, patch) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...patch } : q));
  }, []);

  const addQuestion = () => {
    setQuestions(prev => [...prev, defaultQuestion()]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
  };

  const removeQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const isResumeMode = isResume || questions.some(q => q.draftId != null);

  // ── Save as Draft ──────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (questions.every(q => !q.title.trim())) {
      toast.error('Add at least one question title before saving a draft.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = { questions: questions.map(buildEntry) };
      const res = await saveDraftQuestions(examId, payload);
      if (Array.isArray(res.data)) {
        setQuestions(prev => prev.map((q, i) => {
          const saved = res.data[i];
          return saved?.id ? { ...q, draftId: saved.id } : q;
        }));
        setIsResume(true);
      }
      toast.success(`${questions.length} draft${questions.length !== 1 ? 's' : ''} saved. Return anytime to continue.`);
      onDone();
    } catch (err) {
      const msg = err.response?.data?.message || getErrorMessage(err);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Save & Add to Exam ─────────────────────────────────────────────────────
  const handleSaveAndAdd = async () => {
    setFormError(null);
    for (let i = 0; i < questions.length; i++) {
      const err = validateQuestion(questions[i], i);
      if (err) { setFormError(err); return; }
    }
    setSaving(true);
    try {
      const payload = { questions: questions.map(buildEntry) };
      let res;
      if (isResumeMode) {
        // Resume flow: finalize existing drafts in-place, create any new additions
        res = await finalizeAndAssign(examId, payload);
      } else {
        // Fresh flow: create new BankQuestion records and assign
        res = await bulkCreateAndAssign(examId, payload);
      }
      const { created } = res.data;
      toast.success(`${created} question${created !== 1 ? 's' : ''} created and added to exam.`);
      onDone();
    } catch (err) {
      const msg = err.response?.data?.message || getErrorMessage(err);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingDrafts) {
    return <Loader text="Loading drafts…" />;
  }

  return (
    <div className={styles.builder}>
      <div className={styles.builderHeader}>
        <div>
          <h2 className={styles.builderTitle}>
            {isResume ? 'Resume Draft Questions' : 'Create Questions'}
          </h2>
          <p className={styles.builderSubtitle}>
            {isResume
              ? `Resuming ${questions.length} saved draft${questions.length !== 1 ? 's' : ''}. Edit and click Save & Add to Exam when ready.`
              : 'Build multiple questions at once. They will be created in your Question Bank and added to this exam.'}
          </p>
        </div>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          ✕ Cancel
        </button>
      </div>

      <div className={styles.questionList}>
        {questions.map((q, i) => (
          <SingleQuestionEditor
            key={q._id}
            q={q}
            index={i}
            onChange={(patch) => updateQuestion(i, patch)}
            onRemove={() => removeQuestion(i)}
            canRemove={questions.length > 1}
          />
        ))}
      </div>

      <button type="button" className={styles.addNextBtn} onClick={addQuestion} disabled={saving}>
        + Create Next Question
      </button>

      {formError && <p className={styles.formError}>{formError}</p>}

      <div className={styles.actionBar}>
        <span className={styles.actionCount}>
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </span>
        <div className={styles.actionBtns}>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button variant="secondary" onClick={handleSaveDraft} disabled={saving}>
            {saving ? 'Saving…' : 'Save as Draft'}
          </Button>
          <Button onClick={handleSaveAndAdd} disabled={saving}>
            {saving ? 'Saving…' : 'Save & Add to Exam'}
          </Button>
        </div>
      </div>
    </div>
  );
}
