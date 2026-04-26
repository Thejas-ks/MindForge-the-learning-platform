import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStreak, getHistory, getQuizHistory, getFlashcardHistory } from '../services/api';
import { getUser } from '../utils/auth';
import Layout from '../components/Layout';
import PerformanceTracker from '../components/PerformanceTracker';
import InsightsPanel from '../components/InsightsPanel';
import styles from './Dashboard.module.css';

const cards = [
  {
    to: '/ask',
    title: 'Ask AI',
    desc: 'Get instant answers to any question with AI',
    tag: 'AI Powered',
    bg: 'rgba(79,70,229,0.07)',
    accent: '#4f46e5',
    illustration: (
      <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="110" height="75" rx="12" fill="#4f46e5" opacity="0.12"/>
        <rect x="28" y="28" width="94" height="59" rx="8" fill="#4f46e5" opacity="0.18"/>
        <rect x="36" y="42" width="60" height="8" rx="4" fill="#4f46e5" opacity="0.6"/>
        <rect x="36" y="56" width="44" height="8" rx="4" fill="#4f46e5" opacity="0.4"/>
        <rect x="36" y="70" width="52" height="8" rx="4" fill="#4f46e5" opacity="0.3"/>
        <rect x="70" y="55" width="90" height="60" rx="12" fill="#6366f1" opacity="0.15"/>
        <rect x="78" y="63" width="74" height="44" rx="8" fill="#6366f1" opacity="0.2"/>
        <circle cx="95" cy="82" r="5" fill="#6366f1" opacity="0.7"/>
        <circle cx="112" cy="82" r="5" fill="#6366f1" opacity="0.5"/>
        <circle cx="129" cy="82" r="5" fill="#6366f1" opacity="0.3"/>
        <circle cx="160" cy="30" r="18" fill="#4f46e5" opacity="0.1"/>
        <path d="M152 30 Q160 22 168 30 Q160 38 152 30Z" fill="#4f46e5" opacity="0.4"/>
        <circle cx="160" cy="30" r="6" fill="#4f46e5" opacity="0.6"/>
      </svg>
    ),
  },
  {
    to: '/quiz',
    title: 'Quiz',
    desc: 'Test your knowledge with smart quizzes',
    tag: 'Practice',
    bg: 'rgba(14,165,233,0.07)',
    accent: '#0ea5e9',
    illustration: (
      <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="15" width="140" height="100" rx="12" fill="#0ea5e9" opacity="0.1"/>
        <rect x="42" y="27" width="116" height="76" rx="8" fill="#0ea5e9" opacity="0.12"/>
        <rect x="54" y="40" width="92" height="10" rx="5" fill="#0ea5e9" opacity="0.5"/>
        <rect x="54" y="58" width="30" height="10" rx="5" fill="#0ea5e9" opacity="0.35"/>
        <rect x="54" y="74" width="30" height="10" rx="5" fill="#0ea5e9" opacity="0.35"/>
        <rect x="54" y="90" width="30" height="10" rx="5" fill="#0ea5e9" opacity="0.35"/>
        <circle cx="100" cy="63" r="8" fill="#0ea5e9" opacity="0.2"/>
        <circle cx="100" cy="79" r="8" fill="#0ea5e9" opacity="0.2"/>
        <circle cx="100" cy="95" r="8" fill="#0ea5e9" opacity="0.2"/>
        <circle cx="100" cy="63" r="4" fill="#0ea5e9" opacity="0.5"/>
        <path d="M140 50 L155 65 L175 40" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
        <circle cx="157" cy="55" r="18" fill="#0ea5e9" opacity="0.08"/>
      </svg>
    ),
  },
  {
    to: '/flashcards',
    title: 'Flashcards',
    desc: 'Review concepts with interactive flip cards',
    tag: 'Memory',
    bg: 'rgba(168,85,247,0.07)',
    accent: '#a855f7',
    illustration: (
      <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="35" width="80" height="55" rx="10" fill="#a855f7" opacity="0.12" transform="rotate(-8 15 35)"/>
        <rect x="25" y="30" width="80" height="55" rx="10" fill="#a855f7" opacity="0.18" transform="rotate(-3 25 30)"/>
        <rect x="35" y="28" width="80" height="55" rx="10" fill="#a855f7" opacity="0.25"/>
        <rect x="47" y="40" width="56" height="8" rx="4" fill="#a855f7" opacity="0.6"/>
        <rect x="47" y="54" width="40" height="6" rx="3" fill="#a855f7" opacity="0.4"/>
        <rect x="47" y="66" width="48" height="6" rx="3" fill="#a855f7" opacity="0.3"/>
        <rect x="105" y="50" width="75" height="52" rx="10" fill="#c084fc" opacity="0.15"/>
        <rect x="113" y="58" width="59" height="36" rx="7" fill="#c084fc" opacity="0.2"/>
        <circle cx="142" cy="76" r="12" fill="#a855f7" opacity="0.15"/>
        <path d="M136 76 L141 81 L150 70" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      </svg>
    ),
  },
  {
    to: '/upload',
    title: 'Study Guides',
    desc: 'Upload notes and generate study material',
    tag: 'Upload',
    bg: 'rgba(249,115,22,0.07)',
    accent: '#f97316',
    illustration: (
      <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="20" width="60" height="80" rx="8" fill="#f97316" opacity="0.12"/>
        <rect x="33" y="28" width="44" height="6" rx="3" fill="#f97316" opacity="0.5"/>
        <rect x="33" y="40" width="36" height="5" rx="2.5" fill="#f97316" opacity="0.35"/>
        <rect x="33" y="51" width="40" height="5" rx="2.5" fill="#f97316" opacity="0.35"/>
        <rect x="33" y="62" width="30" height="5" rx="2.5" fill="#f97316" opacity="0.25"/>
        <rect x="33" y="73" width="36" height="5" rx="2.5" fill="#f97316" opacity="0.25"/>
        <rect x="75" y="30" width="60" height="80" rx="8" fill="#fb923c" opacity="0.15"/>
        <rect x="83" y="38" width="44" height="6" rx="3" fill="#f97316" opacity="0.5"/>
        <rect x="83" y="50" width="36" height="5" rx="2.5" fill="#f97316" opacity="0.35"/>
        <rect x="83" y="61" width="40" height="5" rx="2.5" fill="#f97316" opacity="0.35"/>
        <rect x="83" y="72" width="30" height="5" rx="2.5" fill="#f97316" opacity="0.25"/>
        <circle cx="155" cy="45" r="22" fill="#f97316" opacity="0.1"/>
        <path d="M155 35 L155 55 M145 45 L155 35 L165 45" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      </svg>
    ),
  },
  {
    to: '/workout',
    title: 'Brain Workout',
    desc: 'Daily logic, aptitude & coding challenges',
    tag: 'Daily',
    bg: 'rgba(16,185,129,0.07)',
    accent: '#10b981',
    illustration: (
      <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="65" r="42" fill="#10b981" opacity="0.08"/>
        <path d="M80 65 C80 50 90 40 100 40 C110 40 120 50 120 65 C120 75 115 83 107 87 L107 95 L93 95 L93 87 C85 83 80 75 80 65Z" fill="#10b981" opacity="0.2"/>
        <path d="M93 95 L107 95 L107 105 L93 105Z" fill="#10b981" opacity="0.3"/>
        <path d="M90 105 L110 105" stroke="#10b981" strokeWidth="3" strokeLinecap="round" opacity="0.4"/>
        <circle cx="100" cy="65" r="8" fill="#10b981" opacity="0.4"/>
        <path d="M100 57 L100 65 L106 71" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
        <circle cx="55" cy="40" r="8" fill="#10b981" opacity="0.15"/>
        <circle cx="145" cy="40" r="8" fill="#10b981" opacity="0.15"/>
        <circle cx="55" cy="90" r="6" fill="#10b981" opacity="0.1"/>
        <circle cx="145" cy="90" r="6" fill="#10b981" opacity="0.1"/>
        <path d="M62 42 L80 55" stroke="#10b981" strokeWidth="1.5" opacity="0.2" strokeDasharray="3 3"/>
        <path d="M138 42 L120 55" stroke="#10b981" strokeWidth="1.5" opacity="0.2" strokeDasharray="3 3"/>
      </svg>
    ),
  },
  {
    to: '/history',
    title: 'History',
    desc: 'Review all your past questions and answers',
    tag: 'Review',
    bg: 'rgba(244,63,94,0.07)',
    accent: '#f43f5e',
    illustration: (
      <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="70" r="40" fill="#f43f5e" opacity="0.08"/>
        <circle cx="100" cy="70" r="30" fill="none" stroke="#f43f5e" strokeWidth="3" opacity="0.25"/>
        <path d="M100 50 L100 70 L116 70" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
        <circle cx="100" cy="70" r="4" fill="#f43f5e" opacity="0.7"/>
        <path d="M72 42 L68 30 L80 36Z" fill="#f43f5e" opacity="0.3"/>
        <rect x="30" y="88" width="55" height="8" rx="4" fill="#f43f5e" opacity="0.2"/>
        <rect x="30" y="102" width="40" height="6" rx="3" fill="#f43f5e" opacity="0.15"/>
        <rect x="115" y="88" width="55" height="8" rx="4" fill="#f43f5e" opacity="0.2"/>
        <rect x="115" y="102" width="40" height="6" rx="3" fill="#f43f5e" opacity="0.15"/>
        <circle cx="155" cy="35" r="14" fill="#f43f5e" opacity="0.1"/>
        <path d="M149 35 L154 40 L162 28" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
    ),
  },
];

export default function Dashboard() {
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ questions: 0, quizzes: 0, flashcards: 0 });
  const [quizHistory, setQuizHistory] = useState([]);
  const [accuracy, setAccuracy] = useState(0);
  const navigate = useNavigate();
  const user = getUser();
  const username = user?.sub?.split('@')[0] || 'Learner';
  const email = user?.sub || '';

  useEffect(() => {
    getStreak().then(r => setStreak(r.data?.streak ?? 0)).catch(() => {});
    Promise.allSettled([
      getHistory(),
      getQuizHistory(),
      getFlashcardHistory(),
    ]).then(([h, q, f]) => {
      const aiHistory = Array.isArray(h.value?.data) ? h.value.data : [];
      const quizData = Array.isArray(q.value?.data) ? q.value.data : [];

      // Build a map: questionId -> topic (from the original AI question asked)
      const idToTopic = {};
      aiHistory.forEach(item => {
        if (item.id && item.question) {
          // Clean topic: take first 40 chars, strip punctuation at end
          idToTopic[item.id] = item.question.replace(/[?!.]+$/, '').slice(0, 40);
        }
      });

      // Attach topic to each quiz item
      const enrichedQuiz = quizData.map(item => ({
        ...item,
        topic: item.questionId && idToTopic[item.questionId]
          ? idToTopic[item.questionId]
          : null,
      }));

      setQuizHistory(enrichedQuiz);

      const total = quizData.length;
      const correct = quizData.filter(item => item.correctAnswer && item.correctAnswer === item.userAnswer).length;
      setAccuracy(total > 0 ? Math.round((correct / total) * 100) : 0);
      setStats({
        questions: aiHistory.length,
        quizzes: total,
        flashcards: Array.isArray(f.value?.data) ? f.value.data.length : 0,
      });
    });
  }, []);

  return (
    <Layout>
      {/* Performance Tracker */}
      <PerformanceTracker
        questions={stats.questions}
        quizzes={stats.quizzes}
        flashcards={stats.flashcards}
        streak={streak}
      />

      {/* Insights Panel */}
      <InsightsPanel
        quizHistory={quizHistory}
        questions={stats.questions}
        streak={streak}
      />

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Study Tools</h2>
        <p className={styles.sectionSub}>Everything you need to master any subject</p>
      </div>

      <div className={styles.grid}>
        {cards.map(({ to, title, desc, tag, bg, accent, illustration }) => (
          <div key={to} className={styles.card} onClick={() => navigate(to)}>
            <div className={styles.cardTop} style={{ background: bg }}>
              <span className={styles.cardTag} style={{ background: `${accent}18`, color: accent }}>{tag}</span>
              <div className={styles.illustration}>{illustration}</div>
            </div>
            <div className={styles.cardBottom}>
              <h3 className={styles.cardTitle}>{title}</h3>
              <p className={styles.cardDesc}>{desc}</p>
              <span className={styles.cardCta} style={{ color: accent }}>Get started →</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
