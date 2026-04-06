import { useState, useRef, useEffect } from 'react';
import { askQuestion, generateQuiz, generateFlashcards } from '../services/api';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Loader from '../components/Loader';
import FlashcardViewer from '../components/FlashcardViewer';
import MarkdownRenderer from '../components/MarkdownRenderer';
import toast from 'react-hot-toast';
import styles from './AskQuestion.module.css';

function QuizItem({ q, index }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const options = [
    { key: 'A', value: q.optionA },
    { key: 'B', value: q.optionB },
    { key: 'C', value: q.optionC },
    { key: 'D', value: q.optionD },
  ].filter(o => o.value);
  const correct = q.correctAnswer;
  const getClass = (key) => {
    if (!revealed) return selected === key ? styles.optionSelected : styles.optionBtn;
    if (key === correct) return styles.optionCorrect;
    if (key === selected && key !== correct) return styles.optionWrong;
    return styles.optionBtn;
  };
  return (
    <div className={styles.quizItem}>
      <p className={styles.quizQ}><span className={styles.qNum}>Q{index + 1}.</span> {q.question}</p>
      <div className={styles.optionsList}>
        {options.map(({ key, value }) => (
          <button key={key} className={getClass(key)} onClick={() => !revealed && setSelected(key)} disabled={revealed}>
            <span className={styles.optionKey}>{key}</span>
            <span>{value}</span>
          </button>
        ))}
      </div>
      {!revealed && (
        <div className={styles.checkRow}>
          <Button onClick={() => setRevealed(true)} disabled={!selected} variant="secondary">Check Answer</Button>
        </div>
      )}
      {revealed && (
        <div className={selected === correct ? styles.resultCorrect : styles.resultWrong}>
          {selected === correct ? '✅ Correct!' : `❌ Wrong — correct answer is ${correct}`}
        </div>
      )}
    </div>
  );
}

function FlashcardDisplay({ data }) {
  const [flipped, setFlipped] = useState({});
  const cards = Array.isArray(data) ? data : data?.flashcards || data?.cards || [];
  if (!cards.length) return null;
  return (
    <div className={styles.flashcardGrid}>
      {cards.map((card, i) => (
        <div key={i} className={`${styles.flashcard} ${flipped[i] ? styles.flipped : ''}`} onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}>
          <div className={styles.flashcardInner}>
            <div className={styles.flashcardFront}><span className={styles.fcLabel}>FRONT</span><p>{card.front || card.term || card.question}</p></div>
            <div className={styles.flashcardBack}><span className={styles.fcLabel}>BACK</span><p>{card.back || card.definition || card.answer}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Detect if the answer is an error message from backend
function isErrorAnswer(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes('429') || t.includes('quota') || t.includes('rate limit') ||
    t.includes('resource_exhausted') || t.includes('error communicating') ||
    t.includes('too many requests');
}

function getFriendlyError(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('429') || t.includes('quota') || t.includes('rate limit') || t.includes('resource_exhausted'))
    return { type: 'quota', msg: 'AI quota exceeded (20 requests/day on free tier). Please wait a few minutes or try again tomorrow.' };
  if (t.includes('error communicating'))
    return { type: 'service', msg: 'AI service is temporarily unavailable. Please try again in a moment.' };
  return null;
}

// Single chat bubble entry
function ChatEntry({ entry, onQuiz, onFlashcards }) {
  const [quiz, setQuiz] = useState(null);
  const [flashcards, setFlashcards] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [fcLoading, setFcLoading] = useState(false);

  const isError = entry.answer?.startsWith('__ERROR__:');
  const rawErrorText = isError ? entry.answer.replace('__ERROR__:', '') : '';
  const friendlyError = isError ? (
    (rawErrorText.toLowerCase().includes('429') || rawErrorText.toLowerCase().includes('quota') || rawErrorText.toLowerCase().includes('exhausted'))
      ? { icon: '⏳', title: 'Daily Limit Reached', msg: "You've hit the free tier limit of 20 AI requests per day. Please wait until tomorrow or upgrade your Gemini API plan to continue." }
      : { icon: '⚠️', title: 'AI Service Unavailable', msg: 'The AI service is temporarily unavailable. Please try again in a few moments.' }
  ) : null;

  const handleQuiz = async () => {
    if (!entry.questionId) return toast.error('No question ID');
    setQuizLoading(true);
    try {
      const res = await generateQuiz(entry.questionId);
      setQuiz(res.data);
    } catch { toast.error('Failed to generate quiz'); }
    finally { setQuizLoading(false); }
  };

  const handleFlashcards = async () => {
    if (!entry.questionId) return toast.error('No question ID');
    setFcLoading(true);
    try {
      const res = await generateFlashcards(entry.questionId);
      setFlashcards(res.data);
    } catch { toast.error('Failed to generate flashcards'); }
    finally { setFcLoading(false); }
  };

  return (
    <div className={styles.chatEntry}>
      {/* User question bubble */}
      <div className={styles.userBubble}>
        <span className={styles.bubbleLabel}>You</span>
        <p className={styles.userText}>{entry.question}</p>
      </div>

      {/* AI answer bubble */}
      <div className={styles.aiBubble}>
        <span className={styles.bubbleLabel}>MindForge AI</span>
        {friendlyError ? (
          <div className={styles.errorBox}>
            <span className={styles.errorIcon}>{friendlyError.icon}</span>
            <div>
              <p className={styles.errorTitle}>{friendlyError.title}</p>
              <p className={styles.errorMsg}>{friendlyError.msg}</p>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.answerBubble}>
              <MarkdownRenderer text={entry.answer} />
            </div>
            {entry.questionId && (
              <div className={styles.actions}>
                <Button onClick={handleQuiz} disabled={quizLoading || fcLoading} variant="secondary">
                  {quizLoading ? 'Generating…' : '📝 Take Quiz'}
                </Button>
                <Button onClick={handleFlashcards} disabled={fcLoading || quizLoading} variant="secondary">
                  {fcLoading ? 'Generating…' : '🃏 Flashcards'}
                </Button>
              </div>
            )}
            {quizLoading && <Loader text="Building quiz…" />}
            {quiz && (
              <div className={styles.quizWrap}>
                <p className={styles.sectionLabel}>Quiz</p>
                <div className={styles.quizList}>
                  {(Array.isArray(quiz) ? quiz : []).map((q, i) => <QuizItem key={q.id || i} q={q} index={i} />)}
                </div>
              </div>
            )}
            {fcLoading && <Loader text="Creating flashcards…" />}
            {flashcards && (
              <div className={styles.quizWrap}>
                <p className={styles.sectionLabel}>Flashcards <span className={styles.fcHint}>— click to flip</span></p>
                <FlashcardViewer cards={Array.isArray(flashcards) ? flashcards : []} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AskQuestion() {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;
    setQuestion(''); // clear input immediately
    setLoading(true);
    try {
      const res = await askQuestion({ question: q });
      const d = res.data;
      const rawAnswer = d?.answer || d?.response || (typeof d === 'string' ? d : JSON.stringify(d, null, 2));
      const answerText = isErrorAnswer(rawAnswer)
        ? '__ERROR__:' + rawAnswer
        : rawAnswer;
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        question: q,
        answer: answerText,
        questionId: isErrorAnswer(rawAnswer) ? null : (d?.id || null),
      }]);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to get answer';
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        question: q,
        answer: '__ERROR__:' + (typeof msg === 'string' ? msg : JSON.stringify(msg)),
        questionId: null,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setChatHistory([]);
    setQuestion('');
  };

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Ask AI</h1>
            <p className={styles.subtitle}>Get instant answers on any topic</p>
          </div>
          {chatHistory.length > 0 && (
            <Button onClick={handleNewChat} variant="secondary">+ New Chat</Button>
          )}
        </div>

        {/* Empty state */}
        {chatHistory.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💬</span>
            <h2 className={styles.emptyTitle}>How can I help you?</h2>
            <p className={styles.emptySub}>Ask me anything — concepts, code, theory, or practice questions.</p>
            <div className={styles.suggestions}>
              {['What is @RequestParam in Spring Boot?', 'Explain React hooks', 'What is Big O notation?'].map(s => (
                <button key={s} className={styles.suggestionChip} onClick={() => setQuestion(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Chat history */}
        {chatHistory.length > 0 && (
          <div className={styles.chatList}>
            {chatHistory.map(entry => <ChatEntry key={entry.id} entry={entry} />)}
            {loading && (
              <div className={styles.loadingBubble}>
                <Loader size="sm" text="MindForge is thinking…" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {chatHistory.length === 0 && loading && (
          <div className={styles.loadingBubble}>
            <Loader size="sm" text="MindForge is thinking…" />
          </div>
        )}

        {/* Input */}
        <div className={styles.inputArea}>
          <textarea
            rows={3}
            placeholder="Ask anything…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handleAsk()}
            disabled={loading}
          />
          <div className={styles.inputFooter}>
            <span className={styles.hint}>Ctrl+Enter to send</span>
            <Button onClick={handleAsk} disabled={loading || !question.trim()}>
              {loading ? 'Thinking…' : 'Ask MindForge'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
