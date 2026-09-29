import { useEffect, useState, useCallback, useRef } from 'react';
import { getQuestions, addQuestionsToExam } from '../../../services/api';
import { getErrorMessage } from '../../../utils/errorHandler';
import Button from '../../../components/Button';
import Loader from '../../../components/Loader';
import toast from 'react-hot-toast';
import styles from './QuestionBankPicker.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const SECTIONS = ['GENERAL', 'SECTION_A', 'SECTION_B', 'SECTION_C', 'SECTION_D'];

const DIFF_COLOR = {
  EASY:   'var(--success)',
  MEDIUM: 'var(--warning)',
  HARD:   'var(--error)',
};

const TYPE_LABEL = {
  MCQ_SINGLE:   'Single',
  MCQ_MULTIPLE: 'Multi',
  TRUE_FALSE:   'T/F',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── QuestionBankPicker ───────────────────────────────────────────────────────

export default function QuestionBankPicker({ examId, alreadyAssignedIds, onDone, onCancel }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTopic, setFilterTopic] = useState('');

  const [selected, setSelected] = useState(new Set());
  const [section, setSection] = useState('GENERAL');
  const [mandatory, setMandatory] = useState(false);
  const [adding, setAdding] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const assignedSet = new Set(alreadyAssignedIds ?? []);

  // Load questions with server-side search/filter
  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (filterDifficulty) params.difficulty = filterDifficulty;
    if (filterTopic.trim()) params.topic = filterTopic.trim();
    getQuestions(params)
      .then(res => setQuestions(Array.isArray(res.data) ? res.data : []))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [debouncedSearch, filterDifficulty, filterTopic]);

  useEffect(() => { load(); }, [load]);

  // Client-side type filter (not supported by backend param, applied locally)
  const visible = filterType
    ? questions.filter(q => q.questionType === filterType)
    : questions;

  // Separate available vs already-assigned
  const available = visible.filter(q => !assignedSet.has(q.id));
  const alreadyIn  = visible.filter(q => assignedSet.has(q.id));

  // Derive topic suggestions from loaded questions
  const topicSuggestions = [...new Set(questions.map(q => q.topic).filter(Boolean))];

  // Selection helpers
  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => setSelected(new Set(available.map(q => q.id)));
  const clearSelection   = () => setSelected(new Set());

  const allVisibleSelected = available.length > 0 && available.every(q => selected.has(q.id));

  // Add selected to exam
  const handleAdd = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      const ids = [...selected];
      const res = await addQuestionsToExam(examId, { questionIds: ids, section, mandatory });
      const { added, duplicates } = res.data;
      if (duplicates > 0) {
        toast.success(`${added} added, ${duplicates} already assigned (skipped).`);
      } else {
        toast.success(`${added} question${added !== 1 ? 's' : ''} added to exam.`);
      }
      onDone();
    } catch (err) {
      const msg = err.response?.data?.message || getErrorMessage(err);
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const hasFilters = search || filterDifficulty || filterType || filterTopic;

  return (
    <div className={styles.picker}>
      {/* Header */}
      <div className={styles.pickerHeader}>
        <div>
          <h2 className={styles.pickerTitle}>Add from Question Bank</h2>
          <p className={styles.pickerSubtitle}>Select questions to add to this exam.</p>
        </div>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={adding}>
          ✕ Cancel
        </button>
      </div>

      {/* Search + filters */}
      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search questions…"
        />
        <select className={styles.filterSelect} value={filterDifficulty}
          onChange={e => setFilterDifficulty(e.target.value)}>
          <option value="">All difficulties</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className={styles.filterSelect} value={filterType}
          onChange={e => setFilterType(e.target.value)}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className={styles.topicWrap}>
          <input
            className={styles.filterSelect}
            list="picker-topics"
            value={filterTopic}
            onChange={e => setFilterTopic(e.target.value)}
            placeholder="Topic…"
          />
          <datalist id="picker-topics">
            {topicSuggestions.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
        {hasFilters && (
          <button className={styles.clearBtn} onClick={() => {
            setSearch(''); setFilterDifficulty(''); setFilterType(''); setFilterTopic('');
          }}>
            Clear
          </button>
        )}
      </div>

      {/* Bulk controls */}
      {!loading && available.length > 0 && (
        <div className={styles.bulkControls}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={allVisibleSelected ? clearSelection : selectAllVisible}
            />
            {allVisibleSelected ? 'Deselect all visible' : `Select all visible (${available.length})`}
          </label>
          {selected.size > 0 && (
            <button className={styles.clearSelBtn} onClick={clearSelection}>
              Clear selection
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && <Loader text="Loading questions…" />}

      {/* Empty state */}
      {!loading && visible.length === 0 && (
        <div className={styles.empty}>
          <span>📝</span>
          <p>{hasFilters ? 'No questions match the current filters.' : 'Your question bank is empty.'}</p>
          {hasFilters && (
            <button className={styles.clearBtn} onClick={() => {
              setSearch(''); setFilterDifficulty(''); setFilterType(''); setFilterTopic('');
            }}>Clear filters</button>
          )}
        </div>
      )}

      {/* Available questions */}
      {!loading && available.length > 0 && (
        <div className={styles.questionList}>
          {available.map(q => (
            <div
              key={q.id}
              className={`${styles.qRow} ${selected.has(q.id) ? styles.qRowSelected : ''}`}
              onClick={() => toggle(q.id)}
            >
              <input
                type="checkbox"
                checked={selected.has(q.id)}
                onChange={() => toggle(q.id)}
                onClick={e => e.stopPropagation()}
                className={styles.checkbox}
              />
              <div className={styles.qInfo}>
                <span className={styles.qTitle}>{q.title}</span>
                <div className={styles.qMeta}>
                  <span className={styles.diffBadge}
                    style={{ color: DIFF_COLOR[q.difficulty] ?? 'var(--text-dim)',
                             background: `color-mix(in srgb, ${DIFF_COLOR[q.difficulty] ?? 'var(--text-dim)'} 12%, transparent)`,
                             border: `1px solid color-mix(in srgb, ${DIFF_COLOR[q.difficulty] ?? 'var(--text-dim)'} 25%, transparent)` }}>
                    {q.difficulty}
                  </span>
                  <span className={styles.chip}>{TYPE_LABEL[q.questionType] ?? q.questionType}</span>
                  <span className={styles.chip}>🎯 {q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  {q.topic && <span className={styles.chip}>📌 {q.topic}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Already assigned (informational) */}
      {!loading && alreadyIn.length > 0 && (
        <div className={styles.alreadySection}>
          <p className={styles.alreadyLabel}>Already in this exam ({alreadyIn.length})</p>
          <div className={styles.questionList}>
            {alreadyIn.map(q => (
              <div key={q.id} className={`${styles.qRow} ${styles.qRowDisabled}`}>
                <span className={styles.assignedMark}>✓</span>
                <div className={styles.qInfo}>
                  <span className={styles.qTitle}>{q.title}</span>
                  <div className={styles.qMeta}>
                    <span className={styles.chip}>{TYPE_LABEL[q.questionType] ?? q.questionType}</span>
                    <span className={styles.chip}>🎯 {q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add bar */}
      {selected.size > 0 && (
        <div className={styles.addBar}>
          <div className={styles.addBarLeft}>
            <span className={styles.addBarCount}>{selected.size} selected</span>
            <div className={styles.addBarConfig}>
              <select className={styles.addBarSelect} value={section} onChange={e => setSection(e.target.value)}>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={mandatory} onChange={e => setMandatory(e.target.checked)} />
                Mandatory
              </label>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={adding}>
            {adding ? 'Adding…' : `Add ${selected.size} to Exam`}
          </Button>
        </div>
      )}
    </div>
  );
}
