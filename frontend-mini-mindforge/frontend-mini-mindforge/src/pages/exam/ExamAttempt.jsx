
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  getAttemptById,
  getAttemptQuestions,
  getAttemptAnswers,
  saveAttemptAnswer,
  submitAttempt,
  evaluateAttempt,
} from '../../services/api';
import { getErrorMessage } from '../../utils/errorHandler';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Loader from '../../components/Loader';
import toast from 'react-hot-toast';
import styles from './ExamAttempt.module.css';

// ─── Timer ────────────────────────────────────────────────────────────────────

function useCountdown(endsAt) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((new Date(endsAt) - Date.now()) / 1000)));

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setRemaining(Math.max(0, Math.floor((new Date(endsAt) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return remaining;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ─── Question rendering ───────────────────────────────────────────────────────

function QuestionItem({ question, answer, onAnswer, saving }) {
  const { questionType, questionText, options = [] } = question;
  const isSingle = questionType === 'MCQ_SINGLE' || questionType === 'TRUE_FALSE';
  const isMultiple = questionType === 'MCQ_MULTIPLE';

  const selectedSingle = answer?.selectedOptionId ?? null;
  const selectedMultiple = answer?.selectedOptionIds ?? [];

  const qId = question.bankQuestionId;

  const handleSingle = (optId) => {
    if (selectedSingle === optId) return;
    onAnswer(qId, { selectedOptionId: optId });
  };

  const handleMultiple = (optId) => {
    const next = selectedMultiple.includes(optId)
      ? selectedMultiple.filter(id => id !== optId)
      : [...selectedMultiple, optId];
    onAnswer(qId, { selectedOptionIds: next });
  };

  return (
    <div className={styles.questionBlock}>
      <p className={styles.questionText}>{question.questionOrder != null ? `Q${question.questionOrder}. ` : ''}{questionText}</p>
      <div className={styles.optionsList}>
        {options.map((opt) => {
          const optId = opt.id;
          const optText = opt.optionText ?? opt.text ?? opt;
          if (isSingle) {
            const checked = selectedSingle === optId;
            return (
              <button
                key={optId}
                className={`${styles.option} ${checked ? styles.optionSelected : ''}`}
                onClick={() => handleSingle(optId)}
                disabled={saving}
              >
                <span className={`${styles.indicator} ${checked ? styles.indicatorFilled : ''}`} />
                <span>{optText}</span>
              </button>
            );
          }
          if (isMultiple) {
            const checked = selectedMultiple.includes(optId);
            return (
              <button
                key={optId}
                className={`${styles.option} ${checked ? styles.optionSelected : ''}`}
                onClick={() => handleMultiple(optId)}
                disabled={saving}
              >
                <span className={`${styles.checkBox} ${checked ? styles.checkBoxFilled : ''}`}>
                  {checked && '✓'}
                </span>
                <span>{optText}</span>
              </button>
            );
          }
          return null;
        })}
      </div>
      {saving && <p className={styles.savingHint}>Saving…</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamAttempt() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});   // { [questionId]: payload }
  const [savingIds, setSavingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const timedOutRef = useRef(false);
  const saveTimers = useRef({});

  // Load attempt + questions + existing answers
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Use attempt data from navigation state (passed by ExamList after startExam)
      // to avoid re-fetching — getAttemptById has a backend lazy-load issue on GET.
      // Only fall back to getAttemptById on direct URL visit / refresh.
      const stateAttempt = location.state?.attempt;
      if (stateAttempt && String(stateAttempt.id) === String(attemptId)) {
        if (!cancelled) setAttempt(stateAttempt);
      } else {
        try {
          const res = await getAttemptById(attemptId);
          if (!cancelled) setAttempt(res.data);
        } catch (err) {
          if (!cancelled) toast.error(getErrorMessage(err));
          return;
        }
      }

      // Questions and answers are fetched independently — a failure on either
      // shows a toast but does not prevent the page from rendering
      const [questionsRes, answersRes] = await Promise.allSettled([
        getAttemptQuestions(attemptId),
        getAttemptAnswers(attemptId),
      ]);

      if (cancelled) return;

      const qs = questionsRes.status === 'fulfilled' && Array.isArray(questionsRes.value.data)
        ? questionsRes.value.data
        : [];
      if (questionsRes.status === 'rejected') toast.error(getErrorMessage(questionsRes.reason));
      setQuestions(qs);

      const savedList = answersRes.status === 'fulfilled' && Array.isArray(answersRes.value.data)
        ? answersRes.value.data
        : [];

      // Build answers map keyed by bankQuestionId
      const map = {};
      savedList.forEach(a => {
        if (a.bankQuestionId == null) return;
        if (a.selectedOptionIds != null && a.selectedOptionIds.length > 0) {
          map[a.bankQuestionId] = { selectedOptionIds: a.selectedOptionIds };
        } else if (a.selectedOptionId != null) {
          map[a.bankQuestionId] = { selectedOptionId: a.selectedOptionId };
        }
      });
      // Fallback: embedded savedAnswer on each question
      qs.forEach(q => {
        const key = q.bankQuestionId;
        if (map[key] != null) return;
        const sa = q.savedAnswer;
        if (!sa) return;
        if (sa.selectedOptionIds != null && sa.selectedOptionIds.length > 0) {
          map[key] = { selectedOptionIds: sa.selectedOptionIds };
        } else if (sa.selectedOptionId != null) {
          map[key] = { selectedOptionId: sa.selectedOptionId };
        }
      });
      setAnswers(map);
    };

    load().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attemptId]);

  const remaining = useCountdown(attempt?.endsAt);

  // Debounced save
  const handleAnswer = useCallback((questionId, payload) => {
    setAnswers(prev => ({ ...prev, [questionId]: payload }));
    clearTimeout(saveTimers.current[questionId]);
    saveTimers.current[questionId] = setTimeout(async () => {
      setSavingIds(prev => new Set(prev).add(questionId));
      try {
        await saveAttemptAnswer(attemptId, questionId, payload);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setSavingIds(prev => { const s = new Set(prev); s.delete(questionId); return s; });
      }
    }, 400);
  }, [attemptId]);

  // Submit logic (shared by button and timer)
  const doSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitAttempt(attemptId);
      const evalRes = await evaluateAttempt(attemptId);
      navigate(`/attempts/${attemptId}/result`, { state: { evaluation: evalRes.data } });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSubmitting(false);
    }
  }, [attemptId, navigate, submitting]);

  // Timer expiry — submit once
  useEffect(() => {
    if (remaining === 0 && attempt && !timedOutRef.current && !submitting) {
      timedOutRef.current = true;
      toast('⏰ Time is up! Submitting your exam…', { duration: 4000 });
      doSubmit();
    }
  }, [remaining, attempt, submitting, doSubmit]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => Object.values(saveTimers.current).forEach(clearTimeout);
  }, []);

  const handleSubmitClick = () => {
    const unanswered = questions.filter(q => !answers[q.bankQuestionId]);
    if (unanswered.length > 0) {
      if (!window.confirm(`You have ${unanswered.length} unanswered question${unanswered.length !== 1 ? 's' : ''}. Submit anyway?`)) return;
    }
    doSubmit();
  };

  if (loading) return <Layout><Loader text="Loading exam…" /></Layout>;
  if (!attempt) return <Layout><p className={styles.errorMsg}>Attempt not found.</p></Layout>;

  const isExpired = remaining === 0;
  const timerDanger = remaining > 0 && remaining <= 60;

  return (
    <Layout>
      <div className={styles.page}>
        {/* Sticky header */}
        <div className={styles.examHeader}>
          <div className={styles.examMeta}>
            <h1 className={styles.examTitle}>{attempt.examTitle ?? 'Exam'}</h1>
            <span className={styles.questionCount}>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
          </div>
          <div className={`${styles.timer} ${timerDanger ? styles.timerDanger : ''} ${isExpired ? styles.timerExpired : ''}`}>
            ⏱ {isExpired ? '00:00' : formatTime(remaining)}
          </div>
        </div>

        {/* Questions */}
        <div className={styles.questionsList}>
          {questions.map((q, i) => (
            <Card key={q.bankQuestionId} className={styles.questionCard}>
              <div className={styles.questionNumber}>Question {i + 1}</div>
              <QuestionItem
                question={q}
                answer={answers[q.bankQuestionId]}
                onAnswer={handleAnswer}
                saving={savingIds.has(q.bankQuestionId)}
              />
            </Card>
          ))}
        </div>

        {/* Submit */}
        <div className={styles.submitRow}>
          <Button
            onClick={handleSubmitClick}
            disabled={submitting || isExpired}
            variant="primary"
          >
            {submitting ? 'Submitting…' : 'Submit Exam'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
