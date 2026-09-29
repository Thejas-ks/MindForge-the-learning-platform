import { useEffect, useState, useCallback } from 'react';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '../../../services/api';
import { getErrorMessage } from '../../../utils/errorHandler';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Loader from '../../../components/Loader';
import toast from 'react-hot-toast';
import styles from './QuestionBank.module.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPES = ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'];
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

const DIFFICULTY_COLOR = {
  EASY:   '#10b981',
  MEDIUM: '#f59e0b',
  HARD:   '#ef4444',
};

const TYPE_LABEL = {
  MCQ_SINGLE:   'Single Choice',
  MCQ_MULTIPLE: 'Multi Choice',
  TRUE_FALSE:   'True / False',
};

// ─── Default form state ───────────────────────────────────────────────────────

function defaultForm() {
  return {
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
  };
}

function trueFalseOptions() {
  return [
    { optionText: 'True',  correct: true  },
    { optionText: 'False', correct: false },
  ];
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function formFromQuestion(q) {
  return {
    title: q.title ?? '',
    questionText: q.questionText ?? '',
    questionType: q.questionType ?? 'MCQ_SINGLE',
    difficulty: q.difficulty ?? 'EASY',
    marks: q.marks ?? 1,
    topic: q.topic ?? '',
    estimatedTimeSeconds: q.estimatedTimeSeconds ?? '',
    explanation: q.explanation ?? '',
    options: q.options?.length
      ? q.options.map(o => ({ optionText: o.optionText, correct: !!o.correct }))
      : defaultForm().options,
  };
}

function buildPayload(form) {
  const payload = {
    title: form.title.trim(),
    questionText: form.questionText.trim(),
    questionType: form.questionType,
    difficulty: form.difficulty,
    marks: Number(form.marks),
    topic: form.topic.trim() || null,
    estimatedTimeSeconds: form.estimatedTimeSeconds !== '' ? Number(form.estimatedTimeSeconds) : null,
    explanation: form.explanation.trim() || null,
    options: form.options.map((o, i) => ({
      optionText: o.optionText.trim(),
      correct: !!o.correct,
      displayOrder: i,
    })),
  };
  return payload;
}

function validateForm(form) {
  if (!form.title.trim())        return 'Title is required.';
  if (!form.questionText.trim()) return 'Question text is required.';
  if (!form.marks || form.marks < 1) return 'Marks must be at least 1.';
  if (form.questionType !== 'TRUE_FALSE') {
    if (form.options.length < 2) return 'At least 2 options are required.';
    if (form.options.some(o => !o.optionText.trim())) return 'All option texts must be filled.';
    const correctCount = form.options.filter(o => o.correct).length;
    if (form.questionType === 'MCQ_SINGLE' && correctCount !== 1)
      return 'Exactly one correct option is required for Single Choice.';
    if (form.questionType === 'MCQ_MULTIPLE' && correctCount < 1)
      return 'At least one correct option is required for Multi Choice.';
  }
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }) {
  const color = DIFFICULTY_COLOR[difficulty] ?? '#64748b';
  return (
    <span className={styles.badge}
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {difficulty}
    </span>
  );
}

function TypeChip({ type }) {
  return <span className={styles.metaChip}>{TYPE_LABEL[type] ?? type}</span>;
}

function QuestionCard({ question, onEdit, onDelete }) {
  return (
    <Card className={styles.qCard}>
      <div className={styles.cardTop}>
        <div className={styles.cardMeta}>
          <DifficultyBadge difficulty={question.difficulty} />
          <TypeChip type={question.questionType} />
          <span className={styles.metaChip}>🎯 {question.marks} mark{question.marks !== 1 ? 's' : ''}</span>
          {question.topic && <span className={styles.metaChip}>📌 {question.topic}</span>}
          {question.estimatedTimeSeconds && (
            <span className={styles.metaChip}>⏱ {question.estimatedTimeSeconds}s</span>
          )}
        </div>
        <div className={styles.cardActions}>
          <Button variant="ghost" onClick={() => onEdit(question)}>Edit</Button>
          <Button variant="danger" onClick={() => onDelete(question)}>Delete</Button>
        </div>
      </div>
      <p className={styles.qTitle}>{question.title}</p>
      <p className={styles.qText}>{question.questionText}</p>
      {question.options?.length > 0 && (
        <ul className={styles.optionList}>
          {question.options.map((o, i) => (
            <li key={i} className={`${styles.optionItem} ${o.correct ? styles.optionCorrect : ''}`}>
              <span className={styles.optionDot}>{o.correct ? '✓' : '○'}</span>
              {o.optionText}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function OptionsEditor({ form, setForm }) {
  const isTF = form.questionType === 'TRUE_FALSE';

  if (isTF) {
    return (
      <div className={styles.tfNote}>
        True / False options are fixed: <strong>True</strong> (correct) and <strong>False</strong>.
      </div>
    );
  }

  const setOptionText = (i, val) => {
    const opts = [...form.options];
    opts[i] = { ...opts[i], optionText: val };
    setForm(f => ({ ...f, options: opts }));
  };

  const setCorrect = (i) => {
    const opts = form.options.map((o, idx) =>
      form.questionType === 'MCQ_SINGLE'
        ? { ...o, correct: idx === i }
        : { ...o, correct: idx === i ? !o.correct : o.correct }
    );
    setForm(f => ({ ...f, options: opts }));
  };

  const addOption = () =>
    setForm(f => ({ ...f, options: [...f.options, { optionText: '', correct: false }] }));

  const removeOption = (i) =>
    setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));

  return (
    <div className={styles.optionsEditor}>
      <div className={styles.optionsHeader}>
        <span className={styles.fieldLabel}>
          Options
          <span className={styles.fieldHint}>
            {form.questionType === 'MCQ_SINGLE' ? ' — select exactly one correct' : ' — select one or more correct'}
          </span>
        </span>
        <button type="button" className={styles.addOptionBtn} onClick={addOption}>+ Add option</button>
      </div>
      {form.options.map((opt, i) => (
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
          {form.options.length > 2 && (
            <button type="button" className={styles.removeOptionBtn} onClick={() => removeOption(i)}>✕</button>
          )}
        </div>
      ))}
    </div>
  );
}

function QuestionForm({ editingQuestion, onSave, onCancel, saving }) {
  const [form, setForm] = useState(
    editingQuestion ? formFromQuestion(editingQuestion) : defaultForm()
  );
  const [formError, setFormError] = useState(null);

  // When type changes to TRUE_FALSE, fix options; when switching away, restore defaults
  const handleTypeChange = (newType) => {
    setForm(f => ({
      ...f,
      questionType: newType,
      options: newType === 'TRUE_FALSE' ? trueFalseOptions() : defaultForm().options,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validateForm(form);
    if (err) { setFormError(err); return; }
    setFormError(null);
    onSave(buildPayload(form));
  };

  const field = (label, hint) => (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel}>{label}{hint && <span className={styles.fieldHint}> {hint}</span>}</label>
    </div>
  );

  return (
    <Card className={styles.formCard}>
      <h3 className={styles.formTitle}>{editingQuestion ? 'Edit Question' : 'New Question'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>

        <div className={styles.formRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Short descriptive title" />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Question Text</label>
          <textarea value={form.questionText}
            onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
            placeholder="The full question shown to students" rows={3} />
        </div>

        <div className={styles.formRow3}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Type</label>
            <select value={form.questionType} onChange={e => handleTypeChange(e.target.value)}
              className={styles.select}>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Difficulty</label>
            <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
              className={styles.select}>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Marks</label>
            <input type="number" min={1} value={form.marks}
              onChange={e => setForm(f => ({ ...f, marks: e.target.value }))} />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Topic <span className={styles.fieldHint}>(optional)</span></label>
            <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
              placeholder="e.g. Java, Algorithms" />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Est. Time (seconds) <span className={styles.fieldHint}>(optional)</span></label>
            <input type="number" min={1} value={form.estimatedTimeSeconds}
              onChange={e => setForm(f => ({ ...f, estimatedTimeSeconds: e.target.value }))}
              placeholder="e.g. 60" />
          </div>
        </div>

        <OptionsEditor form={form} setForm={setForm} />

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Explanation <span className={styles.fieldHint}>(optional)</span></label>
          <textarea value={form.explanation}
            onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
            placeholder="Shown after the exam is evaluated" rows={2} />
        </div>

        {formError && <p className={styles.formError}>{formError}</p>}

        <div className={styles.formFooter}>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingQuestion ? 'Save Changes' : 'Create Question'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterTopic, setFilterTopic] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null); // null = create
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {};
    if (filterDifficulty) params.difficulty = filterDifficulty;
    if (filterTopic.trim()) params.topic = filterTopic.trim();
    getQuestions(params)
      .then(res => setQuestions(Array.isArray(res.data) ? res.data : []))
      .catch(err => {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [filterDifficulty, filterTopic]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingQuestion(null); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openEdit   = (q)  => { setEditingQuestion(q);   setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const closeForm  = ()   => { setShowForm(false); setEditingQuestion(null); };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload);
        toast.success('Question updated.');
      } else {
        await createQuestion(payload);
        toast.success('Question created.');
      }
      closeForm();
      load();
    } catch (err) {
      // Prefer the raw server message for validation errors (400)
      const raw = err.response?.data?.message;
      toast.error(raw || getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (question) => {
    if (!window.confirm(`Delete "${question.title}"? This cannot be undone.`)) return;
    try {
      await deleteQuestion(question.id);
      toast.success('Question deleted.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Derive unique topics from loaded questions for the topic filter datalist
  const topicSuggestions = [...new Set(questions.map(q => q.topic).filter(Boolean))];

  return (
    <Layout>
      <div className={styles.page}>

        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Question Bank</h1>
            <p className={styles.subtitle}>
              {loading ? 'Loading…' : `${questions.length} question${questions.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {!showForm && (
            <Button onClick={openCreate}>+ New Question</Button>
          )}
        </div>

        {/* Inline form */}
        {showForm && (
          <div className={styles.formSection}>
            <QuestionForm
              editingQuestion={editingQuestion}
              onSave={handleSave}
              onCancel={closeForm}
              saving={saving}
            />
          </div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <div className={styles.topicFilterWrap}>
            <input
              className={styles.filterInput}
              list="topic-suggestions"
              value={filterTopic}
              onChange={e => setFilterTopic(e.target.value)}
              placeholder="Filter by topic…"
            />
            <datalist id="topic-suggestions">
              {topicSuggestions.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          {(filterDifficulty || filterTopic) && (
            <button className={styles.clearBtn}
              onClick={() => { setFilterDifficulty(''); setFilterTopic(''); }}>
              Clear filters
            </button>
          )}
        </div>

        {/* States */}
        {loading && <Loader text="Loading questions…" />}

        {!loading && error && (
          <div className={styles.empty}>
            <span>⚠️</span>
            <p>Failed to load questions.</p>
            <p className={styles.emptyHint}>{error}</p>
            <Button variant="secondary" onClick={load}>Retry</Button>
          </div>
        )}

        {!loading && !error && questions.length === 0 && (
          <div className={styles.empty}>
            <span>📝</span>
            <p>{filterDifficulty || filterTopic ? 'No questions match the current filters.' : 'No questions yet.'}</p>
            <p className={styles.emptyHint}>
              {filterDifficulty || filterTopic
                ? 'Try clearing the filters.'
                : 'Create your first question to get started.'}
            </p>
          </div>
        )}

        {!loading && !error && questions.length > 0 && (
          <div className={styles.grid}>
            {questions.map(q => (
              <QuestionCard key={q.id} question={q} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
