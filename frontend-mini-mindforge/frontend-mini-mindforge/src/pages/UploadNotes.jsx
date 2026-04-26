import { useState, useRef } from 'react';
import { quizFromFile, flashcardsFromFile } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import FlashcardViewer from '../components/FlashcardViewer';
import toast from 'react-hot-toast';
import styles from './UploadNotes.module.css';

function QuizItem({ q, index }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const opts = q.options
    ? q.options.map((v, i) => ({ key: ['A','B','C','D'][i], value: v }))
    : ['A','B','C','D'].map(k => ({ key: k, value: q[`option${k}`] })).filter(o => o.value);

  const correct = q.correctAnswer || q.correct_answer || q.answer;

  const getClass = (key) => {
    if (!revealed) return selected === key ? styles.optionSelected : styles.option;
    if (key === correct) return styles.optionCorrect;
    if (key === selected && key !== correct) return styles.optionWrong;
    return styles.option;
  };

  return (
    <div className={styles.quizItem}>
      <p className={styles.quizQ}><span className={styles.qNum}>Q{index + 1}.</span> {q.question || q.questionText || q.q}</p>
      <div className={styles.optionsList}>
        {opts.map(({ key, value }) => (
          <button key={key} className={getClass(key)} onClick={() => !revealed && setSelected(key)} disabled={revealed}>
            <span className={styles.optionKey}>{key}</span>
            <span>{value}</span>
          </button>
        ))}
      </div>
      {!revealed && (
        <button
          onClick={() => setRevealed(true)}
          disabled={!selected}
          style={{ alignSelf: 'flex-start', padding: '0.45rem 1rem', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)', background: 'var(--card)', color: selected ? 'var(--primary)' : 'var(--text-dim)', cursor: selected ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, transition: 'var(--transition)' }}
        >Check Answer</button>
      )}
      {revealed && (
        <div className={selected === correct ? styles.resultCorrect : styles.resultWrong}>
          {selected === correct ? '✅ Correct!' : `❌ Wrong — correct answer is ${correct}`}
          {q.explanation && <p className={styles.explanation}>💡 {q.explanation}</p>}
        </div>
      )}
    </div>
  );
}

function QuizDisplay({ data }) {
  const questions = Array.isArray(data) ? data : data?.questions || data?.quiz || (data?.data && Array.isArray(data.data) ? data.data : null);
  if (!questions || questions.length === 0)
    return <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>Unable to parse quiz. Try again.</p>;
  return (
    <div className={styles.quizList}>
      {questions.map((q, i) => <QuizItem key={i} q={q} index={i} />)}
    </div>
  );
}

function FlashcardDisplay({ data }) {
  const [flipped, setFlipped] = useState({});
  const cards = Array.isArray(data) ? data : data?.flashcards || data?.cards || (data?.data && Array.isArray(data.data) ? data.data : null);
  if (!cards) return <pre className={styles.rawPre}>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>;

  return (
    <div className={styles.flashcardGrid}>
      {cards.map((card, i) => (
        <div key={i} className={`${styles.flashcard} ${flipped[i] ? styles.flipped : ''}`} onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}>
          <div className={styles.flashcardInner}>
            <div className={styles.flashcardFront}>
              <span className={styles.fcLabel}>FRONT</span>
              <p>{card.front || card.term || card.question || card.q}</p>
            </div>
            <div className={styles.flashcardBack}>
              <span className={styles.fcLabel}>BACK</span>
              <p>{card.back || card.definition || card.answer || card.a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UploadNotes() {
  const [file, setFile] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [flashcards, setFlashcards] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [fcLoading, setFcLoading] = useState(false);
  const [count, setCount] = useState(10);
  const inputRef = useRef();

  const COUNT_OPTIONS = [5, 10, 15, 20];

  const extract = (res) => res.data;

  const buildForm = () => {
    const fd = new FormData();
    fd.append('file', file);
    return fd;
  };

  const handleQuiz = async () => {
    if (!file) return toast.error('Please select a file first');
    setQuizLoading(true); setQuiz(null);
    try {
      const res = await quizFromFile(buildForm(), count);
      setQuiz(extract(res));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setQuizLoading(false);
    }
  };

  const handleFlashcards = async () => {
    if (!file) return toast.error('Please select a file first');
    setFcLoading(true); setFlashcards(null);
    try {
      const res = await flashcardsFromFile(buildForm(), count);
      setFlashcards(extract(res));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setFcLoading(false);
    }
  };

  const isLoading = quizLoading || fcLoading;

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Upload Notes</h1>
        <p className={styles.subtitle}>Generate quizzes and flashcards from your documents</p>

        <Card className={styles.uploadCard}>
          <div
            className={`${styles.dropzone} ${file ? styles.hasFile : ''}`}
            onClick={() => inputRef.current.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt"
              style={{ display: 'none' }}
              onChange={(e) => { setFile(e.target.files[0]); setQuiz(null); setFlashcards(null); }}
            />
            {file ? (
              <>
                <span className={styles.fileIcon}>📄</span>
                <p className={styles.fileName}>{file.name}</p>
                <p className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <span className={styles.uploadIcon}>⬆</span>
                <p className={styles.dropText}>Click to upload PDF or TXT</p>
                <p className={styles.dropHint}>Max file size: 10MB</p>
              </>
            )}
          </div>

          {file && (
            <div className={styles.actions}>
              <div className={styles.countRow}>
                <span className={styles.countLabel}>Count:</span>
                {COUNT_OPTIONS.map(n => (
                  <button key={n} className={`${styles.countBtn} ${count === n ? styles.countActive : ''}`} onClick={() => setCount(n)}>{n}</button>
                ))}
              </div>
              <Button onClick={handleQuiz} disabled={isLoading}>
                {quizLoading ? 'Generating…' : '📝 Generate Quiz'}
              </Button>
              <Button onClick={handleFlashcards} disabled={isLoading} variant="secondary">
                {fcLoading ? 'Generating…' : '🃏 Generate Flashcards'}
              </Button>
              <Button onClick={() => { setFile(null); setQuiz(null); setFlashcards(null); }} variant="ghost" disabled={isLoading}>
                ✕ Clear
              </Button>
            </div>
          )}
        </Card>

        {quizLoading && <Loader text="Building quiz from file…" />}
        {fcLoading && <Loader text="Creating flashcards from file…" />}

        {!file && !quiz && !flashcards && !quizLoading && !fcLoading && (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>Upload notes to generate a quiz or flashcards</p>
        )}

        {quiz && (
          <Card className={styles.resultCard}>
            <p className={styles.sectionLabel}>Generated Quiz</p>
            <QuizDisplay data={quiz} />
          </Card>
        )}

        {flashcards && (
          <Card className={styles.resultCard}>
            <p className={styles.sectionLabel}>Generated Flashcards</p>
            <FlashcardViewer cards={Array.isArray(flashcards) ? flashcards : []} />
          </Card>
        )}
      </div>
    </Layout>
  );
}
