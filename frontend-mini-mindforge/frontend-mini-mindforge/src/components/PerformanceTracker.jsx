import { useEffect, useState } from 'react';
import styles from './PerformanceTracker.module.css';

function AnimatedBar({ percent, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(percent), 120 + delay);
    return () => clearTimeout(t);
  }, [percent, delay]);
  return (
    <div className={styles.barTrack}>
      <div
        className={styles.barFill}
        style={{ width: `${width}%`, background: color, transitionDelay: `${delay}ms` }}
      />
    </div>
  );
}

function StatPill({ icon, value, label, color }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 200); return () => clearTimeout(t); }, []);
  return (
    <div className={`${styles.pill} ${visible ? styles.pillVisible : ''}`}>
      <span className={styles.pillIcon} style={{ background: `${color}18`, color }}>{icon}</span>
      <div>
        <p className={styles.pillValue} style={{ color }}>{value}</p>
        <p className={styles.pillLabel}>{label}</p>
      </div>
    </div>
  );
}

const METRICS = [
  { key: 'questions',  label: 'Questions Asked',   icon: '💬', color: '#4f46e5', max: 50  },
  { key: 'quizzes',   label: 'Quizzes Taken',      icon: '📝', color: '#0ea5e9', max: 30  },
  { key: 'flashcards',label: 'Flashcards Created', icon: '🃏', color: '#a855f7', max: 40  },
  { key: 'streak',    label: 'Day Streak',          icon: '🔥', color: '#f97316', max: 30  },
];

function getLevel(score) {
  if (score >= 85) return { label: 'Expert',      color: '#10b981', emoji: '🏆' };
  if (score >= 65) return { label: 'Advanced',    color: '#4f46e5', emoji: '⭐' };
  if (score >= 40) return { label: 'Intermediate',color: '#0ea5e9', emoji: '📈' };
  if (score >= 15) return { label: 'Beginner',    color: '#f97316', emoji: '🌱' };
  return                  { label: 'New Learner', color: '#94a3b8', emoji: '👋' };
}

export default function PerformanceTracker({ questions = 0, quizzes = 0, flashcards = 0, streak = 0 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const counts = { questions, quizzes, flashcards, streak };

  const overallScore = Math.min(100, Math.round(
    (Math.min(questions, 50) / 50) * 35 +
    (Math.min(quizzes,   30) / 30) * 25 +
    (Math.min(flashcards,40) / 40) * 20 +
    (Math.min(streak,    30) / 30) * 20
  ));

  const level = getLevel(overallScore);

  const [scoreDisplay, setScoreDisplay] = useState(0);
  useEffect(() => {
    if (!mounted) return;
    if (overallScore === 0) { setScoreDisplay(0); return; }
    let start = 0;
    const step = Math.max(1, Math.ceil(overallScore / 40));
    const timer = setInterval(() => {
      start += step;
      if (start >= overallScore) { setScoreDisplay(overallScore); clearInterval(timer); }
      else setScoreDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [mounted, overallScore]);

  return (
    <div className={`${styles.tracker} ${mounted ? styles.trackerVisible : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Performance Tracker</h3>
          <p className={styles.subtitle}>Based on your activity across all tools</p>
        </div>
        <div className={styles.levelBadge} style={{ background: `${level.color}15`, borderColor: `${level.color}30` }}>
          <span>{level.emoji}</span>
          <span className={styles.levelLabel} style={{ color: level.color }}>{level.label}</span>
        </div>
      </div>

      {/* Overall score ring */}
      <div className={styles.scoreRow}>
        <div className={styles.scoreRing}>
          <svg viewBox="0 0 100 100" className={styles.ringsvg}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8"/>
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${mounted ? (overallScore / 100) * 251.2 : 0} 251.2`}
              strokeDashoffset="0"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) 0.2s' }}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5"/>
                <stop offset="100%" stopColor="#a855f7"/>
              </linearGradient>
            </defs>
          </svg>
          <div className={styles.scoreCenter}>
            <span className={styles.scoreNum}>{scoreDisplay}</span>
            <span className={styles.scoreLabel}>/ 100</span>
          </div>
        </div>

        {/* Stat pills */}
        <div className={styles.pills}>
          {METRICS.map(({ key, icon, label, color }, i) => (
            <StatPill
              key={key}
              icon={icon}
              value={counts[key]}
              label={label}
              color={color}
              delay={i * 80}
            />
          ))}
        </div>
      </div>

      {/* Progress bars */}
      <div className={styles.bars}>
        {METRICS.map(({ key, label, color, max }, i) => {
          const pct = Math.min(100, Math.round((counts[key] / max) * 100));
          const contextLabel = pct >= 75 ? 'Good progress' : pct >= 40 ? 'Keep going' : 'Needs improvement';
          return (
            <div key={key} className={styles.barRow}>
              <div className={styles.barMeta}>
                <span className={styles.barLabel}>{label}</span>
                <div className={styles.barRight}>
                  <span className={styles.barContext} style={{ color: pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444' }}>{contextLabel}</span>
                  <span className={styles.barPct} style={{ color }}>{pct}%</span>
                </div>
              </div>
              <AnimatedBar percent={pct} color={color} delay={i * 100} />
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className={styles.tip}>
        <span className={styles.tipIcon}>💡</span>
        <p className={styles.tipText}>
          {overallScore < 15 && 'Start by asking your first question to build momentum!'}
          {overallScore >= 15 && overallScore < 40 && 'Great start! Try taking a quiz to boost your score.'}
          {overallScore >= 40 && overallScore < 65 && 'You\'re making solid progress. Keep your streak alive!'}
          {overallScore >= 65 && overallScore < 85 && 'Excellent work! Generate flashcards to push to Expert level.'}
          {overallScore >= 85 && 'Outstanding! You\'re at the top — keep the streak going! 🏆'}
        </p>
      </div>
    </div>
  );
}
