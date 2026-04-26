import styles from './UserProfile.module.css';

function getLevel(accuracy) {
  if (accuracy > 75) return { label: 'Advanced', color: '#10b981', emoji: '🏆', next: null };
  if (accuracy >= 50) return { label: 'Intermediate', color: '#4f46e5', emoji: '⭐', next: 'Keep accuracy above 75% to reach Advanced' };
  return { label: 'Beginner', color: '#f59e0b', emoji: '🌱', next: 'Reach 50% accuracy to become Intermediate' };
}

export default function UserProfile({ username, email, streak, quizzes, accuracy }) {
  const level = getLevel(accuracy);

  return (
    <div className={styles.profile}>
      <div className={styles.avatar}>
        <span className={styles.avatarText}>{username?.[0]?.toUpperCase() || '?'}</span>
      </div>
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <h2 className={styles.name}>{username}</h2>
          <span className={styles.levelBadge} style={{ background: `${level.color}15`, color: level.color, borderColor: `${level.color}30` }}>
            {level.emoji} {level.label}
          </span>
        </div>
        <p className={styles.email}>{email}</p>
        {level.next && <p className={styles.levelHint}>{level.next}</p>}
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>🔥 {streak}</span>
          <span className={styles.statLbl}>Streak</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>📝 {quizzes}</span>
          <span className={styles.statLbl}>Quizzes</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>🎯 {accuracy}%</span>
          <span className={styles.statLbl}>Accuracy</span>
        </div>
      </div>
    </div>
  );
}
