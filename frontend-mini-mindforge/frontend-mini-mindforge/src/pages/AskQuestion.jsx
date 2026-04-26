import { useState, useRef, useEffect } from 'react';
import { askQuestion, askFromFile, generateQuiz, generateFlashcards } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Loader from '../components/Loader';
import FlashcardViewer from '../components/FlashcardViewer';
import MarkdownRenderer from '../components/MarkdownRenderer';
import toast from 'react-hot-toast';
import styles from './AskQuestion.module.css';

// ─── QUIZ RESULT SYSTEM ───────────────────────────────────────────────────────

function getPerformanceLabel(pct) {
  if (pct >= 80) return { label: 'Excellent! 🏆', color: '#10b981' };
  if (pct >= 50) return { label: 'Good Job! 👍', color: '#f59e0b' };
  return { label: 'Needs Improvement 📚', color: '#ef4444' };
}

function QuizResult({ quiz }) {
  const total = quiz.length;
  const score = quiz.filter(q => q.userAnswer === q.correctAnswer).length;
  const pct = Math.round((score / total) * 100);
  const perf = getPerformanceLabel(pct);

  return (
    <div className={styles.quizResult}>
      <div className={styles.resultSummary}>
        <div className={styles.scoreCircle}>
          <span className={styles.scoreNum}>{score}/{total}</span>
          <span className={styles.scorePct}>{pct}%</span>
        </div>
        <div className={styles.resultInfo}>
          <p className={styles.perfLabel} style={{ color: perf.color }}>{perf.label}</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%`, background: perf.color }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QUIZ ITEM ────────────────────────────────────────────────────────────────

function QuizItem({ q, index, onAnswer, answered }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const options = ['A', 'B', 'C', 'D'].map(k => ({ key: k, value: q[`option${k}`] })).filter(o => o.value);
  const correct = q.correctAnswer;

  const handleReveal = () => {
    setRevealed(true);
    onAnswer(index, selected, selected === correct);
  };

  const getClass = (key) => {
    if (!revealed) return selected === key ? styles.optionSelected : styles.optionBtn;
    if (key === correct) return styles.optionCorrect;
    if (key === selected && key !== correct) return styles.optionWrong;
    return styles.optionBtn;
  };

  return (
    <div className={styles.quizItem}>
      <p className={styles.quizQ}>
        <span className={styles.qNum}>Q{index + 1}.</span> {q.question}
        {revealed && (
          <span className={selected === correct ? styles.qCorrectBadge : styles.qWrongBadge}>
            {selected === correct ? '✅' : '❌'}
          </span>
        )}
      </p>
      <div className={styles.optionsList}>
        {options.map(({ key, value }) => (
          <button key={key} className={getClass(key)}
            onClick={() => !revealed && setSelected(key)} disabled={revealed}>
            <span className={styles.optionKey}>{key}</span>
            <span>{value}</span>
          </button>
        ))}
      </div>
      {!revealed && (
        <div className={styles.checkRow}>
          <Button onClick={handleReveal} disabled={!selected} variant="secondary">Check Answer</Button>
        </div>
      )}
      {revealed && (
        <div className={selected === correct ? styles.resultCorrect : styles.resultWrong}>
          {selected === correct ? '✅ Correct!' : `❌ Wrong — correct answer is ${correct}`}
          {q.explanation && (
            <div className={styles.explanationBox}>
              <p className={styles.explanationTitle}>💡 Explanation</p>
              <p className={styles.explanation}>{q.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TYPEWRITER ANIMATION ────────────────────────────────────────────────────

function TypewriterText({ text, speed = 8 }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    setDone(false);
    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <>
      <MarkdownRenderer text={displayed} />
      {!done && <span className={styles.cursor}>▋</span>}
    </>
  );
}

// ─── CHAT ENTRY ───────────────────────────────────────────────────────────────

function ChatEntry({ entry, isNew }) {
  const [quiz, setQuiz] = useState(null);
  const [flashcards, setFlashcards] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [fcLoading, setFcLoading] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [fcDone, setFcDone] = useState(false);

  // Track per-question answers for result system
  const [answers, setAnswers] = useState({});

  const isError = entry.answer?.startsWith('__ERROR__:');
  const rawErrorText = isError ? entry.answer.replace('__ERROR__:', '') : '';
  const friendlyError = isError ? (
    (rawErrorText.toLowerCase().includes('quota') || rawErrorText.toLowerCase().includes('limit'))
      ? { icon: '⏳', title: 'AI Limit Reached', msg: 'AI usage limit reached. Please try again in a few moments.' }
      : { icon: '⚠️', title: 'Something went wrong', msg: 'Something went wrong on our side. Please try again later.' }
  ) : null;

  const handleQuiz = async () => {
    if (!entry.questionId || quizDone) return;
    setQuizLoading(true);
    try {
      const res = await generateQuiz(entry.questionId);
      const data = Array.isArray(res.data) ? res.data : [];
      // Attach userAnswer tracking
      setQuiz(data.map(q => ({ ...q, userAnswer: null })));
      setQuizDone(true);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setQuizLoading(false); }
  };

  const handleFlashcards = async () => {
    if (!entry.questionId || fcDone) return;
    setFcLoading(true);
    try {
      const res = await generateFlashcards(entry.questionId);
      setFlashcards(Array.isArray(res.data) ? res.data : []);
      setFcDone(true);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setFcLoading(false); }
  };

  const handleAnswer = (index, userAnswer, isCorrect) => {
    setAnswers(prev => ({ ...prev, [index]: { userAnswer, isCorrect } }));
    if (quiz) {
      setQuiz(prev => prev.map((q, i) => i === index ? { ...q, userAnswer } : q));
    }
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = quiz && answeredCount === quiz.length;

  return (
    <div className={styles.chatEntry}>
      {/* User bubble */}
      <div className={styles.userBubble}>
        <span className={styles.bubbleLabel}>You</span>
        <p className={styles.userText}>{entry.question}</p>
      </div>

      {/* AI bubble */}
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
              {isNew
                ? <TypewriterText text={entry.answer} />
                : <MarkdownRenderer text={entry.answer} />}
            </div>
            <TtsButton text={entry.answer} />
            {entry.questionId && (!quizDone || !fcDone) && (
              <div className={styles.actions}>
                {!quizDone && (
                  <Button onClick={handleQuiz} disabled={quizLoading || fcLoading} variant="secondary">
                    {quizLoading ? 'Generating…' : '📝 Take Quiz'}
                  </Button>
                )}
                {!fcDone && (
                  <Button onClick={handleFlashcards} disabled={fcLoading || quizLoading} variant="secondary">
                    {fcLoading ? 'Generating…' : '🃏 Flashcards'}
                  </Button>
                )}
              </div>
            )}

            {/* Status chips when done */}
            {(quizDone || fcDone) && (
              <div className={styles.statusChips}>
                {quizDone && <span className={styles.statusChip}>✅ Quiz generated</span>}
                {fcDone && <span className={styles.statusChip}>✅ Flashcards generated</span>}
                {entry.questionId && !quizDone && (
                  <Button onClick={handleQuiz} disabled={quizLoading} variant="secondary" size="sm">
                    {quizLoading ? '…' : '📝 Quiz'}
                  </Button>
                )}
                {entry.questionId && !fcDone && (
                  <Button onClick={handleFlashcards} disabled={fcLoading} variant="secondary" size="sm">
                    {fcLoading ? '…' : '🃏 Cards'}
                  </Button>
                )}
              </div>
            )}

            {quizLoading && <Loader text="Building quiz…" />}

            {/* Quiz section */}
            {quiz && quiz.length > 0 && (
              <div className={styles.quizWrap}>
                <p className={styles.sectionLabel}>Quiz — {quiz.length} Questions</p>
                <div className={styles.quizList}>
                  {quiz.map((q, i) => (
                    <QuizItem key={q.id || i} q={q} index={i}
                      onAnswer={handleAnswer} answered={!!answers[i]} />
                  ))}
                </div>
                {/* Show result summary when all answered */}
                {allAnswered && <QuizResult quiz={quiz} />}
              </div>
            )}

            {fcLoading && <Loader text="Creating flashcards…" />}

            {/* Flashcards section */}
            {flashcards && flashcards.length > 0 && (
              <div className={styles.quizWrap}>
                <p className={styles.sectionLabel}>Flashcards <span className={styles.fcHint}>— click to flip</span></p>
                <FlashcardViewer cards={flashcards} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── TTS BUTTON ────────────────────────────────────────────────────────────────

function TtsButton({ text }) {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef(null);

  const handleToggle = () => {
    if (!window.speechSynthesis) return toast.error('Text-to-speech not supported in this browser.');
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const clean = text.replace(/[#*`>_~]/g, '').trim();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  return (
    <button className={`${styles.ttsBtn} ${speaking ? styles.ttsBtnActive : ''}`}
      onClick={handleToggle} title={speaking ? 'Stop audio' : 'Play audio'}>
      {speaking ? '⏹️ Stop' : '🔊 Listen'}
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const MAX_HISTORY = 10;
const DYNAMIC_SUGGESTIONS = [
  'Explain React hooks with examples',
  'What is Big O notation?',
  'How does JWT authentication work?',
  'What is the difference between SQL and NoSQL?',
  'Explain OOP concepts in Java',
  'What is REST API?',
  'How does garbage collection work?',
  'Explain microservices architecture',
  'What is Docker and how does it work?',
  'Explain recursion with an example',
];

// Pick 4 random suggestions each session
function getRandomSuggestions(history) {
  if (history.length > 0) {
    // Use last asked topics as suggestions
    return history.slice(-4).map(h => h.question).reverse();
  }
  const shuffled = [...DYNAMIC_SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

function isErrorAnswer(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes('429') || t.includes('quota') || t.includes('rate limit') ||
    t.includes('resource_exhausted') || t.includes('error communicating') ||
    t.includes('too many requests');
}

// Build conversation history array for backend
function buildHistory(chatHistory) {
  const msgs = [];
  chatHistory.forEach(entry => {
    if (entry.answer?.startsWith('__ERROR__:')) return;
    msgs.push({ role: 'user', content: entry.question });
    msgs.push({ role: 'assistant', content: entry.answer || '' });
  });
  // Keep last MAX_HISTORY messages
  return msgs.slice(-MAX_HISTORY);
}

export default function AskQuestion() {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectionPopup, setSelectionPopup] = useState(null);
  const [listening, setListening] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [newestId, setNewestId] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef(null);
  const chatAreaRef = useRef(null);
  const pageRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 150);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Select-text → Ask MindForge
  useEffect(() => {
    const handleMouseUp = (e) => {
      const selected = window.getSelection()?.toString().trim();
      if (selected && selected.length > 5) {
        setSelectionPopup({ text: selected, x: e.clientX, y: e.clientY });
      } else {
        setSelectionPopup(null);
      }
    };
    const handleMouseDown = () => setSelectionPopup(null);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // STT — Speech to Text
  const handleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return toast.error('Speech recognition not supported in this browser.');

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuestion(prev => prev ? prev + ' ' + transcript : transcript);
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') toast.error('Microphone permission denied.');
      else toast.error('Speech recognition error. Please try again.');
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  // File attach — just store it, don't send yet
  const handleFileAttach = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) return toast.error('File too large. Maximum size is 5MB.');
    const allowed = ['.pdf', '.txt', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) return toast.error('Unsupported file type. Use PDF, TXT, or DOCX.');
    setAttachedFile({ file, name: file.name });
  };

  const handleAsk = async (overrideQuestion) => {
    const q = (overrideQuestion || question).trim();
    if (!q && !attachedFile) return;
    setQuestion('');
    setSelectionPopup(null);
    setLoading(true);
    const history = buildHistory(chatHistory);

    try {
      let d;
      if (attachedFile) {
        // Send file + optional user message together
        const formData = new FormData();
        formData.append('file', attachedFile.file);
        if (q) formData.append('message', q);
        const res = await askFromFile(formData);
        d = res.data;
        setAttachedFile(null);
      } else {
        const res = await askQuestion({ question: q, history });
        d = res.data;
      }

      const rawAnswer = d?.answer || d?.response || (typeof d === 'string' ? d : JSON.stringify(d, null, 2));
      const answerText = isErrorAnswer(rawAnswer) ? '__ERROR__:' + rawAnswer : rawAnswer;
      const newId = Date.now();
      setNewestId(newId);
      setChatHistory(prev => [...prev, {
        id: newId,
        question: attachedFile ? `📄 ${attachedFile.name}${q ? ' — ' + q : ''}` : q,
        answer: answerText,
        questionId: isErrorAnswer(rawAnswer) ? null : (d?.id || null),
      }]);
    } catch (err) {
      const msg = getErrorMessage(err);
      const newId = Date.now();
      setNewestId(newId);
      setChatHistory(prev => [...prev, {
        id: newId,
        question: q || (attachedFile ? `📄 ${attachedFile.name}` : ''),
        answer: '__ERROR__:' + msg, questionId: null,
      }]);
      setAttachedFile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className={styles.page} ref={pageRef}>

        {/* Floating new chat — always visible when chat has messages */}
        {chatHistory.length > 0 && (
          <button className={styles.floatingNewChat}
            onClick={() => { setChatHistory([]); setQuestion(''); setAttachedFile(null); }}>
            + New Chat
          </button>
        )}

        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Ask MindForge AI</h1>
            <p className={styles.subtitle}>Get instant answers on any topic</p>
          </div>
        </div>

        {/* Empty state with dynamic suggestions */}
        {chatHistory.length === 0 && !loading && !attachedFile && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💬</span>
            <h2 className={styles.emptyTitle}>How can I help you?</h2>
            <p className={styles.emptySub}>Ask anything, upload a file, or use your voice.</p>
            <div className={styles.suggestions}>
              {getRandomSuggestions(chatHistory).map(s => (
                <button key={s} className={styles.suggestionChip} onClick={() => setQuestion(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable chat area */}
        {(chatHistory.length > 0 || loading) && (
          <div className={styles.chatArea} ref={chatAreaRef}>
            <div className={styles.chatList}>
              {chatHistory.map(entry => (
                <ChatEntry key={entry.id} entry={entry} isNew={entry.id === newestId} />
              ))}
              {loading && (
                <div className={styles.loadingBubble}>
                  <Loader size="sm" text="MindForge is thinking…" />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            {/* Scroll to bottom button */}
            {showScrollBtn && (
              <button className={styles.scrollToBottom}
                onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                ↓ Scroll to bottom
              </button>
            )}
          </div>
        )}

        {/* Select-text popup */}
        {selectionPopup && (
          <div className={styles.selectionPopup}
            style={{ top: selectionPopup.y - 48, left: selectionPopup.x - 60 }}
            onMouseDown={(e) => e.stopPropagation()}>
            <button className={styles.selectionBtn} onClick={() => {
              setQuestion(selectionPopup.text);
              setSelectionPopup(null);
              window.getSelection()?.removeAllRanges();
            }}>⚡ Ask MindForge</button>
          </div>
        )}

        {/* Input area */}
        <div className={styles.inputArea}>
          {/* File attachment preview */}
          {attachedFile && (
            <div className={styles.filePreview}>
              <span className={styles.filePreviewIcon}>📄</span>
              <span className={styles.filePreviewName}>{attachedFile.name}</span>
              <button className={styles.filePreviewRemove} onClick={() => setAttachedFile(null)} title="Remove">✕</button>
            </div>
          )}
          <textarea rows={3}
            placeholder={attachedFile ? `Add a message about "${attachedFile.name}" or press Enter to send…` : 'Ask anything… or use the buttons below'}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            disabled={loading} />
          <div className={styles.inputToolbar}>
            <div className={styles.toolbarLeft}>
              <button
                className={`${styles.iconBtn} ${listening ? styles.iconBtnActive : ''}`}
                onClick={handleMic}
                title={listening ? 'Stop recording' : 'Voice input'}
                disabled={loading}>
                {listening ? '🔴' : '🎤'}
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Attach file (PDF, TXT, DOCX)"
                disabled={loading}>
                📎
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx"
                style={{ display: 'none' }} onChange={handleFileAttach} />
              {listening && <span className={styles.listeningBadge}>Listening…</span>}
              {attachedFile && !listening && <span className={styles.attachedBadge}>📎 Attached</span>}
            </div>
            <div className={styles.toolbarRight}>
              <span className={styles.hint}>Ctrl+Enter to send • Select text to ask about it</span>
              <Button onClick={() => handleAsk()} disabled={loading || (!question.trim() && !attachedFile)}>
                {loading ? 'Thinking…' : 'Ask MindForge'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
