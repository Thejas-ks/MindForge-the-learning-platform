import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStreak, getHistory, getQuizHistory, getFlashcardHistory } from '../services/api';
import { getUser, removeToken } from '../utils/auth';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';
import styles from './Profile.module.css';

function getLevel(accuracy) {
  if (accuracy > 75) return { label: 'Advanced', color: '#10b981', emoji: '🏆' };
  if (accuracy >= 50) return { label: 'Intermediate', color: '#4f46e5', emoji: '⭐' };
  return { label: 'Beginner', color: '#f59e0b', emoji: '🌱' };
}

function getBarColor(pct) {
  if (pct >= 75) return '#10b981';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statIcon} style={{ background: `${color}15`, color }}>{icon}</span>
      <div>
        <p className={styles.statValue} style={{ color }}>{value}</p>
        <p className={styles.statLabel}>{label}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const user = getUser();
  const email = user?.sub || '';
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('displayName') || email.split('@')[0] || 'Learner');
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [loading, setLoading] = useState(true);

  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ questions: 0, quizzes: 0, flashcards: 0, accuracy: 0 });
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      getStreak(),
      getHistory(),
      getQuizHistory(),
      getFlashcardHistory(),
    ]).then(([s, h, q, f]) => {
      setStreak(s.value?.data?.streak ?? 0);

      const aiHistory = Array.isArray(h.value?.data) ? h.value.data : [];
      const quizData = Array.isArray(q.value?.data) ? q.value.data : [];
      const flashData = Array.isArray(f.value?.data) ? f.value.data : [];

      // Build topic map from quiz history joined with AI history
      const idToTopic = {};
      aiHistory.forEach(item => {
        if (item.id && item.question) {
          idToTopic[item.id] = item.question.replace(/[?!.]+$/, '').slice(0, 35);
        }
      });

      // Group quiz items by topic session
      const sessionMap = {};
      quizData.forEach(item => {
        const topic = item.questionId && idToTopic[item.questionId] ? idToTopic[item.questionId] : null;
        if (!topic) return;
        const key = `${topic}__${item.questionId}`;
        if (!sessionMap[key]) sessionMap[key] = { topic, sessions: 0 };
        sessionMap[key].sessions += 1;
      });

      const topicSessions = {};
      Object.values(sessionMap).forEach(({ topic, sessions }) => {
        topicSessions[topic] = (topicSessions[topic] || 0) + 1;
      });

      const topicList = Object.entries(topicSessions)
        .map(([name, sessions]) => ({ name, sessions }))
        .sort((a, b) => b.sessions - a.sessions);

      setTopics(topicList);
      setStats({
        questions: aiHistory.length,
        quizzes: quizData.length,
        flashcards: flashData.length,
        accuracy: 0, // stored client-side only
      });
    }).finally(() => setLoading(false));
  }, []);

  const level = getLevel(stats.accuracy);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      const name = nameInput.trim();
      setDisplayName(name);
      localStorage.setItem('displayName', name);
      toast.success('Name updated!');
    }
    setEditing(false);
  };

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  // Recommendations
  const recs = [];
  if (streak === 0) recs.push({ icon: '🔥', text: "Complete today's brain workout to start your streak", to: '/workout' });
  if (stats.questions < 3) recs.push({ icon: '💬', text: 'Ask more questions to build your knowledge base', to: '/ask' });
  if (stats.quizzes === 0) recs.push({ icon: '📝', text: 'Take your first quiz to track topic performance', to: '/quiz' });
  if (topics.length > 0) recs.push({ icon: '🃏', text: `Review flashcards for "${topics[0].name}"`, to: '/flashcards' });
  if (recs.length === 0) recs.push({ icon: '⭐', text: 'Try a harder brain workout to push your limits', to: '/workout' });

  if (loading) return <Layout><div style={{ padding: '3rem' }}><Loader text="Loading profile…" /></div></Layout>;

  return (
    <Layout>
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>
              <span className={styles.avatarText}>{displayName[0]?.toUpperCase()}</span>
            </div>
            <span className={styles.levelBadge} style={{ background: `${level.color}15`, color: level.color, borderColor: `${level.color}30` }}>
              {level.emoji} {level.label}
            </span>
          </div>
          <div className={styles.headerInfo}>
            {editing ? (
              <div className={styles.editRow}>
                <input className={styles.nameInput} value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  autoFocus />
                <button className={styles.saveBtn} onClick={handleSaveName}>Save</button>
                <button className={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            ) : (
              <div className={styles.nameRow}>
                <h1 className={styles.name}>{displayName}</h1>
                <button className={styles.editBtn} onClick={() => { setNameInput(displayName); setEditing(true); }}>✏️ Edit</button>
              </div>
            )}
            <p className={styles.email}>{email}</p>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        {/* Stats grid */}
        <div className={styles.statsGrid}>
          <StatCard icon="🔥" value={streak} label="Day Streak" color="#f97316" />
          <StatCard icon="📝" value={stats.quizzes} label="Quizzes Taken" color="#0ea5e9" />
          <StatCard icon="💬" value={stats.questions} label="Questions Asked" color="#4f46e5" />
          <StatCard icon="🃏" value={stats.flashcards} label="Flashcards Created" color="#a855f7" />
        </div>

        <div className={styles.twoCol}>
          {/* Topic insights */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>📊 Topics Studied</h2>
            {topics.length === 0 ? (
              <div className={styles.empty}>
                <p>No topics yet.</p>
                <p className={styles.emptyHint}>Ask a question and generate a quiz to see your topics here.</p>
              </div>
            ) : (
              <div className={styles.topicList}>
                {topics.slice(0, 6).map(t => (
                  <div key={t.name} className={styles.topicRow}>
                    <span className={styles.topicDot} style={{ background: getBarColor(60) }} />
                    <span className={styles.topicName}>{t.name}</span>
                    <span className={styles.topicSessions}>{t.sessions} session{t.sessions !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>💡 Recommendations</h2>
            <div className={styles.recList}>
              {recs.slice(0, 4).map((r, i) => (
                <button key={i} className={styles.recItem} onClick={() => navigate(r.to)}>
                  <span className={styles.recIcon}>{r.icon}</span>
                  <span className={styles.recText}>{r.text}</span>
                  <span className={styles.recArrow}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
