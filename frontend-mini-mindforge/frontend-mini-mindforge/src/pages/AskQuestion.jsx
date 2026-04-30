import { useState, useRef, useEffect, useCallback } from 'react';
import { chatSend, chatHistory, chatConversations, chatDeleteConversation, generateQuiz, generateFlashcards, uploadNotes } from '../services/api';
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

// ─── TTS HOOK ─────────────────────────────────────────────────────────────────

function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef(null);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) { toast.error('Text-to-speech not supported in this browser.'); return; }
    window.speechSynthesis.cancel();
    const plain = text.replace(/[#*`_~>\[\]]/g, '').replace(/\n+/g, ' ').trim();
    const utter = new SpeechSynthesisUtterance(plain);
    utter.rate = 1;
    utter.pitch = 1;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speaking, speak, stop };
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
  const { speaking, speak, stop } = useTTS();

  const isUser = msg.role === 'user';
  // questionId comes from backend ChatMessage entity
  const qId = msg.questionId;

  const handleQuiz = async () => {
    if (!qId || quizDone) return;
    setQuizLoading(true);
    try {
      const res = await generateQuiz(qId);
      setQuiz((Array.isArray(res.data) ? res.data : []).map(q => ({ ...q, userAnswer: null })));
      setQuizDone(true);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setQuizLoading(false); }
  };

  const handleFlashcards = async () => {
    if (!qId || fcDone) return;
    setFcLoading(true);
    try {
      const res = await generateFlashcards(qId);
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

      {/* Action buttons — always shown for assistant messages */}
      <div className={styles.actions}>
        {/* TTS */}
        <button
          className={`${styles.actionBtn} ${speaking ? styles.actionBtnActive : ''}`}
          onClick={() => speaking ? stop() : speak(msg.content)}
          title={speaking ? 'Stop listening' : 'Listen to response'}
        >
          {speaking ? '⏹ Stop' : '🔊 Listen'}
        </button>

        {/* Quiz — only if questionId available */}
        {qId && !quizDone && (
          <button className={styles.actionBtn} onClick={handleQuiz} disabled={quizLoading || fcLoading}>
            {quizLoading ? '⏳ Generating…' : '📝 Take Quiz'}
          </button>
        )}

        {/* Flashcards — only if questionId available */}
        {qId && !fcDone && (
          <button className={styles.actionBtn} onClick={handleFlashcards} disabled={fcLoading || quizLoading}>
            {fcLoading ? '⏳ Generating…' : '🃏 Flashcards'}
          </button>
        )}

        {/* Status chips after generation */}
        {quizDone && <span className={styles.statusChip}>✅ Quiz generated</span>}
        {fcDone && <span className={styles.statusChip}>✅ Flashcards generated</span>}
      </div>

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
  // Global notes context (persists across messages in session)
  const [globalNotes, setGlobalNotes] = useState(null); // { filename, content }
  const [notesUploading, setNotesUploading] = useState(false);
  // Inline attachment (per message)
  const [attachedFile, setAttachedFile] = useState(null); // { filename, content }
  // Selected text popup
  const [selectedText, setSelectedText] = useState('');
  const [popupPos, setPopupPos] = useState(null);
  // STT
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const globalNotesInputRef = useRef(null);
  const inlineFileInputRef = useRef(null);

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [question]);

  // ── Selected text feature ──────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (text && text.length > 5) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setPopupPos({ top: rect.top + window.scrollY - 44, left: rect.left + rect.width / 2 });
      } else {
        setSelectedText('');
        setPopupPos(null);
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleAskSelected = () => {
    if (!selectedText) return;
    setPopupPos(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
    handleSend(selectedText);
  };

  // ── STT ───────────────────────────────────────────────────────────────────
  const toggleSTT = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Speech recognition not supported in this browser.'); return; }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuestion(prev => prev ? prev + ' ' + transcript : transcript);
    };
    rec.onerror = () => { setListening(false); toast.error('Voice input failed. Please try again.'); };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  // ── Global Notes Upload ───────────────────────────────────────────────────
  const handleGlobalNotesUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setNotesUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadNotes(formData);
      setGlobalNotes({ filename: res.data.filename, content: res.data.content });
      toast.success(`Notes uploaded: ${res.data.filename}`);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setNotesUploading(false); }
  };

  // ── Inline Attachment ─────────────────────────────────────────────────────
  const handleInlineAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadNotes(formData);
      setAttachedFile({ filename: res.data.filename, content: res.data.content });
      toast.success(`Attached: ${res.data.filename}`);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // ── Conversations ─────────────────────────────────────────────────────────
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

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async (overrideText) => {
    const text = (overrideText || question).trim();
    if (!text || loading) return;
    setQuestion('');
    setLoading(true);

    // Inline attachment takes priority over global notes
    const notesContext = attachedFile?.content || globalNotes?.content || null;
    setAttachedFile(null);

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: text }]);

    try {
      const res = await chatSend({ conversationId: activeConvId, message: text, notesContext });
      const { conversationId, conversationTitle, userMessage, assistantMessage } = res.data;

      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        userMessage,
        assistantMessage,
      ]);
      setNewestMsgId(assistantMessage.id);

      if (!activeConvId) {
        setActiveConvId(conversationId);
        setConversations(prev => [
          { id: conversationId, title: conversationTitle, createdAt: new Date().toISOString() },
          ...prev,
        ]);
      } else {
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

        {/* Selected text popup */}
        {popupPos && selectedText && (
          <button
            className={styles.selectedTextPopup}
            style={{ top: popupPos.top, left: popupPos.left }}
            onMouseDown={(e) => { e.preventDefault(); handleAskSelected(); }}
          >
            💬 Ask MindForge
          </button>
        )}

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

          {/* Hidden file inputs */}
          <input ref={globalNotesInputRef} type="file" accept=".pdf,.txt,.docx" style={{ display: 'none' }} onChange={handleGlobalNotesUpload} />
          <input ref={inlineFileInputRef} type="file" accept=".pdf,.txt,.docx" style={{ display: 'none' }} onChange={handleInlineAttach} />

          {/* Top bar */}
          <div className={styles.chatTopBar}>
            <button className={styles.sidebarToggle} onClick={() => setSidebarOpen(p => !p)} title="Toggle sidebar">
              {sidebarOpen ? '◀' : '▶'}
            </button>
            <div>
              <h1 className={styles.title}>Ask MindForge AI</h1>
              <p className={styles.subtitle}>Continuous AI chat with memory</p>
            </div>
            <div className={styles.topBarActions}>
              {globalNotes ? (
                <div className={styles.notesActiveBadge}>
                  <span>📄 {globalNotes.filename}</span>
                  <button onClick={() => setGlobalNotes(null)} title="Remove notes">✕</button>
                </div>
              ) : (
                <button
                  className={styles.uploadNotesBtn}
                  onClick={() => globalNotesInputRef.current?.click()}
                  disabled={notesUploading}
                >
                  {notesUploading ? '⏳ Uploading…' : '📎 Upload Notes'}
                </button>
              )}
              {activeConvId && (
                <button className={styles.newChatTopBtn} onClick={handleNewChat}>＋ New Chat</button>
              )}
            </div>
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
            {/* Inline attachment preview */}
            {attachedFile && (
              <div className={styles.attachedFileBar}>
                <span>📄 {attachedFile.filename}</span>
                <span className={styles.attachedFileHint}>Using as context for next message</span>
                <button onClick={() => setAttachedFile(null)} title="Remove">✕</button>
              </div>
            )}
            {globalNotes && !attachedFile && (
              <div className={styles.attachedFileBar}>
                <span>📄 {globalNotes.filename}</span>
                <span className={styles.attachedFileHint}>Global notes active for all messages</span>
              </div>
            )}
            <div className={styles.inputBox}>
              {/* STT button */}
              <button
                className={`${styles.sttBtn} ${listening ? styles.sttBtnActive : ''}`}
                onClick={toggleSTT}
                title={listening ? 'Stop listening' : 'Voice input'}
                type="button"
              >
                {listening ? '⏹' : '🎤'}
              </button>
              {/* Inline attach button */}
              <button
                className={styles.attachBtn}
                onClick={() => inlineFileInputRef.current?.click()}
                title="Attach file to this message"
                type="button"
              >
                📎
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={listening ? 'Listening…' : 'Message MindForge AI…'}
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
                title="Ask MindForge (Enter)"
              >
                {loading ? '⏳' : 'Ask MindForge'}
              </button>
            </div>
            <p className={styles.inputHint}>Enter to send · Shift+Enter for new line · 🎤 voice · 📎 attach file · Select text to ask</p>
          </div>
        </div>
      </div>
    </div>
  );
}
