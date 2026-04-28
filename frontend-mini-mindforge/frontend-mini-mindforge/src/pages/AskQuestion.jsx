import { useState, useRef, useEffect, useCallback } from 'react';
import { chatSend, chatHistory, chatConversations, chatDeleteConversation, generateQuiz, generateFlashcards } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import Loader from '../components/Loader';
import FlashcardViewer from '../components/FlashcardViewer';
import MarkdownRenderer from '../components/MarkdownRenderer';
import toast from 'react-hot-toast';
import styles from './AskQuestion.module.css';

// ─── QUIZ RESULT ──────────────────────────────────────────────────────────────

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
        {revealed && <span className={selected === correct ? styles.qCorrectBadge : styles.qWrongBadge}>{selected === correct ? '✅' : '❌'}</span>}
      </p>
      <div className={styles.optionsList}>
        {options.map(({ key, value }) => (
          <button key={key} className={getClass(key)} onClick={() => !revealed && setSelected(key)} disabled={revealed}>
            <span className={styles.optionKey}>{key}</span>
            <span>{value}</span>
          </button>
        ))}
      </div>
      {!revealed && <div className={styles.checkRow}><Button onClick={handleReveal} disabled={!selected} variant="secondary">Check Answer</Button></div>}
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

// ─── TYPEWRITER ───────────────────────────────────────────────────────────────

function TypewriterText({ text, speed = 6 }) {
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
      if (indexRef.current >= text.length) { clearInterval(interval); setDone(true); }
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

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isNew }) {
  const [quiz, setQuiz] = useState(null);
  const [flashcards, setFlashcards] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [fcLoading, setFcLoading] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [fcDone, setFcDone] = useState(false);
  const [answers, setAnswers] = useState({});

  const isUser = msg.role === 'user';

  const handleQuiz = async () => {
    if (!msg.questionId || quizDone) return;
    setQuizLoading(true);
    try {
      const res = await generateQuiz(msg.questionId);
      setQuiz((Array.isArray(res.data) ? res.data : []).map(q => ({ ...q, userAnswer: null })));
      setQuizDone(true);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setQuizLoading(false); }
  };

  const handleFlashcards = async () => {
    if (!msg.questionId || fcDone) return;
    setFcLoading(true);
    try {
      const res = await generateFlashcards(msg.questionId);
      setFlashcards(Array.isArray(res.data) ? res.data : []);
      setFcDone(true);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setFcLoading(false); }
  };

  const handleAnswer = (index, userAnswer) => {
    setAnswers(prev => ({ ...prev, [index]: { userAnswer } }));
    if (quiz) setQuiz(prev => prev.map((q, i) => i === index ? { ...q, userAnswer } : q));
  };

  const allAnswered = quiz && Object.keys(answers).length === quiz.length;

  if (isUser) {
    return (
      <div className={styles.userBubble}>
        <span className={styles.bubbleLabel}>You</span>
        <p className={styles.userText}>{msg.content}</p>
      </div>
    );
  }

  return (
    <div className={styles.aiBubble}>
      <span className={styles.bubbleLabel}>MindForge AI</span>
      <div className={styles.answerBubble}>
        {isNew ? <TypewriterText text={msg.content} /> : <MarkdownRenderer text={msg.content} />}
      </div>

      {msg.questionId && (!quizDone || !fcDone) && (
        <div className={styles.actions}>
          {!quizDone && <Button onClick={handleQuiz} disabled={quizLoading || fcLoading} variant="secondary">{quizLoading ? 'Generating…' : '📝 Take Quiz'}</Button>}
          {!fcDone && <Button onClick={handleFlashcards} disabled={fcLoading || quizLoading} variant="secondary">{fcLoading ? 'Generating…' : '🃏 Flashcards'}</Button>}
        </div>
      )}

      {(quizDone || fcDone) && (
        <div className={styles.statusChips}>
          {quizDone && <span className={styles.statusChip}>✅ Quiz generated</span>}
          {fcDone && <span className={styles.statusChip}>✅ Flashcards generated</span>}
        </div>
      )}

      {quizLoading && <Loader text="Building quiz…" />}
      {quiz && quiz.length > 0 && (
        <div className={styles.quizWrap}>
          <p className={styles.sectionLabel}>Quiz — {quiz.length} Questions</p>
          <div className={styles.quizList}>
            {quiz.map((q, i) => <QuizItem key={q.id || i} q={q} index={i} onAnswer={handleAnswer} answered={!!answers[i]} />)}
          </div>
          {allAnswered && <QuizResult quiz={quiz} />}
        </div>
      )}

      {fcLoading && <Loader text="Creating flashcards…" />}
      {flashcards && flashcards.length > 0 && (
        <div className={styles.quizWrap}>
          <p className={styles.sectionLabel}>Flashcards <span className={styles.fcHint}>— click to flip</span></p>
          <FlashcardViewer cards={flashcards} />
        </div>
      )}
    </div>
  );
}

// ─── CONVERSATION SIDEBAR ─────────────────────────────────────────────────────

function ConversationSidebar({ conversations, activeId, onSelect, onNew, onDelete, loading }) {
  return (
    <div className={styles.convSidebar}>
      <div className={styles.convSidebarHeader}>
        <span className={styles.convSidebarTitle}>Chats</span>
        <button className={styles.newChatBtn} onClick={onNew} title="New chat">＋</button>
      </div>
      <div className={styles.convList}>
        {loading && <div className={styles.convLoading}><Loader size="sm" /></div>}
        {!loading && conversations.length === 0 && (
          <p className={styles.convEmpty}>No conversations yet</p>
        )}
        {conversations.map(conv => (
          <div
            key={conv.id}
            className={`${styles.convItem} ${conv.id === activeId ? styles.convItemActive : ''}`}
            onClick={() => onSelect(conv.id)}
          >
            <span className={styles.convItemTitle}>{conv.title || 'New Chat'}</span>
            <button
              className={styles.convDeleteBtn}
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
              title="Delete"
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Explain React hooks with examples',
  'What is Big O notation?',
  'How does JWT authentication work?',
  'What is the difference between SQL and NoSQL?',
  'Explain OOP concepts in Java',
  'What is REST API?',
  'How does garbage collection work?',
  'Explain microservices architecture',
];

export default function AskQuestion() {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(false);
  const [newestMsgId, setNewestMsgId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [question]);

  const loadConversations = async () => {
    setConvLoading(true);
    try {
      const res = await chatConversations();
      setConversations(res.data || []);
    } catch { /* silent */ }
    finally { setConvLoading(false); }
  };

  const loadHistory = useCallback(async (convId) => {
    setLoading(true);
    try {
      const res = await chatHistory(convId);
      setMessages(res.data || []);
      setActiveConvId(convId);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  const handleSelectConversation = (convId) => {
    if (convId === activeConvId) return;
    loadHistory(convId);
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setQuestion('');
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await chatDeleteConversation(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (convId === activeConvId) handleNewChat();
      toast.success('Conversation deleted');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleSend = async (overrideText) => {
    const text = (overrideText || question).trim();
    if (!text || loading) return;
    setQuestion('');
    setLoading(true);

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = { id: tempId, role: 'user', content: text };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await chatSend({ conversationId: activeConvId, message: text });
      const { conversationId, conversationTitle, userMessage, assistantMessage } = res.data;

      // Replace optimistic + add assistant
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        userMessage,
        assistantMessage,
      ]);

      setNewestMsgId(assistantMessage.id);

      // Update conversation list
      if (!activeConvId) {
        setActiveConvId(conversationId);
        setConversations(prev => [
          { id: conversationId, title: conversationTitle, createdAt: new Date().toISOString() },
          ...prev,
        ]);
      } else {
        // Update title if it changed (first message sets it)
        setConversations(prev => prev.map(c =>
          c.id === conversationId ? { ...c, title: conversationTitle } : c
        ));
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const suggestions = SUGGESTIONS.sort(() => Math.random() - 0.5).slice(0, 4);
  const showEmpty = messages.length === 0 && !loading;

  return (
    <div className={styles.pageWrapper}>
      <Navbar />
      <div className={styles.chatPage}>

        {/* Conversation Sidebar */}
        <div className={`${styles.sidebarWrapper} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <ConversationSidebar
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelectConversation}
            onNew={handleNewChat}
            onDelete={handleDeleteConversation}
            loading={convLoading}
          />
        </div>

        {/* Main chat area */}
        <div className={styles.chatMain}>

          {/* Top bar */}
          <div className={styles.chatTopBar}>
            <button className={styles.sidebarToggle} onClick={() => setSidebarOpen(p => !p)} title="Toggle sidebar">
              {sidebarOpen ? '◀' : '▶'}
            </button>
            <div>
              <h1 className={styles.title}>Ask MindForge AI</h1>
              <p className={styles.subtitle}>Continuous AI chat with memory</p>
            </div>
            {activeConvId && (
              <button className={styles.newChatTopBtn} onClick={handleNewChat}>＋ New Chat</button>
            )}
          </div>

          {/* Messages */}
          <div className={styles.messagesArea}>
            {showEmpty && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>💬</span>
                <h2 className={styles.emptyTitle}>How can I help you?</h2>
                <p className={styles.emptySub}>Start a conversation — I remember everything you say.</p>
                <div className={styles.suggestions}>
                  {suggestions.map(s => (
                    <button key={s} className={styles.suggestionChip} onClick={() => handleSend(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isNew={msg.id === newestMsgId}
              />
            ))}

            {loading && (
              <div className={styles.typingIndicator}>
                <span className={styles.bubbleLabel}>MindForge AI</span>
                <div className={styles.typingDots}>
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={styles.inputArea}>
            <div className={styles.inputBox}>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Message MindForge AI…"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={loading}
                className={styles.chatInput}
              />
              <button
                className={styles.sendBtn}
                onClick={() => handleSend()}
                disabled={loading || !question.trim()}
                title="Send (Enter)"
              >
                {loading ? '…' : '↑'}
              </button>
            </div>
            <p className={styles.inputHint}>Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}
