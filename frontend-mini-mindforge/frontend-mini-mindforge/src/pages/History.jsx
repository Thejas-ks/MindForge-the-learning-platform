import { useEffect, useState } from 'react';
import { getHistory } from '../services/api';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Loader from '../components/Loader';
import MarkdownRenderer from '../components/MarkdownRenderer';
import styles from './History.module.css';

function isErrorText(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes('429') || t.includes('quota') || t.includes('error communicating') || t.startsWith('__error__');
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then((res) => setHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>History</h1>
        <p className={styles.subtitle}>Your past questions and AI answers</p>

        {loading && <Loader text="Loading history…" />}

        {!loading && history.length === 0 && (
          <div className={styles.empty}>
            <span>🕘</span>
            <p>No history yet. Start by asking a question!</p>
          </div>
        )}

        <div className={styles.list}>
          {history.map((item, i) => (
            <Card key={item.id || i} className={styles.historyCard}>
              <div className={styles.qRow}>
                <span className={styles.qBadge}>Q</span>
                <p className={styles.question}>{item.question}</p>
              </div>
              <div className={styles.divider} />
              <div className={styles.aRow}>
                <span className={styles.aBadge}>A</span>
                {isErrorText(item.answer) ? (
                  <p className={styles.errorAnswer}>⚠️ AI was unavailable when this question was asked.</p>
                ) : (
                  <div className={styles.answerBody}><MarkdownRenderer text={item.answer} /></div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
