import { useNavigate } from 'react-router-dom';
import styles from './InsightsPanel.module.css';

function getBarColor(pct) {
  if (pct >= 75) return '#10b981';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

function getContextLabel(pct) {
  if (pct >= 75) return 'Strong';
  if (pct >= 50) return 'Keep going';
  return 'Needs improvement';
}

function TopicBar({ topic, accuracy, attempted }) {
  const color = attempted ? getBarColor(accuracy) : '#94a3b8';
  const label = attempted ? getContextLabel(accuracy) : 'Not attempted';
  const displayPct = attempted ? accuracy : 0;

  return (
    <div className={styles.topicRow}>
      <div className={styles.topicMeta}>
        <span className={styles.topicName} title={topic}>{topic}</span>
        <span className={styles.topicLabel} style={{ color }}>{label}</span>
      </div>
      <div className={styles.topicTrack}>
        <div
          className={styles.topicFill}
          style={{ width: `${displayPct}%`, background: color }}
        />
      </div>
      <span className={styles.topicPct} style={{ color }}>
        {attempted ? `${accuracy}%` : '—'}
      </span>
    </div>
  );
}

export default function InsightsPanel({ quizHistory, questions, streak }) {
  const navigate = useNavigate();

  // Group by topic — use the enriched topic field from Dashboard
  const topicMap = {};
  (quizHistory || []).forEach(item => {
    const topic = item.topic || null;
    if (!topic) return; // skip items with no topic mapping
    if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
    topicMap[topic].total += 1;
    // userAnswer is tracked client-side in AskQuestion but not stored in DB
    // We use correctAnswer presence as a proxy for attempted
    topicMap[topic].correct += 0; // accuracy tracked via quiz result system
  });

  // Since userAnswer isn't stored in DB, build topic list from quiz sets grouped by questionId
  // Each questionId = one topic session. Count sessions per topic.
  const sessionMap = {};
  (quizHistory || []).forEach(item => {
    const topic = item.topic;
    if (!topic) return;
    const key = `${topic}__${item.questionId}`;
    if (!sessionMap[key]) sessionMap[key] = { topic, count: 0 };
    sessionMap[key].count += 1;
  });

  // Build unique topics with session counts
  const topicSessions = {};
  Object.values(sessionMap).forEach(({ topic, count }) => {
    if (!topicSessions[topic]) topicSessions[topic] = 0;
    topicSessions[topic] += 1;
  });

  const topics = Object.entries(topicSessions)
    .map(([name, sessions]) => ({ name, sessions, attempted: sessions > 0 }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6);

  const hasTopics = topics.length > 0;

  // Recommendations based on available data
  const recs = [];
  if (!hasTopics && questions > 0) {
    recs.push({ icon: '📝', text: 'Generate a quiz from your asked questions to track topic performance', action: () => navigate('/quiz') });
  }
  if (streak === 0) {
    recs.push({ icon: '🔥', text: "Complete today's brain workout to start your streak", action: () => navigate('/workout') });
  }
  if (questions < 3) {
    recs.push({ icon: '💬', text: 'Ask more questions to build your knowledge base', action: () => navigate('/ask') });
  }
  if (hasTopics) {
    recs.push({ icon: '📚', text: `Review flashcards for "${topics[topics.length - 1]?.name}"`, action: () => navigate('/flashcards') });
  }
  if (recs.length === 0) {
    recs.push({ icon: '⭐', text: 'Try a harder brain workout to push your limits', action: () => navigate('/workout') });
  }

  // Next best action
  let nextAction = { icon: '📝', text: 'Take a quiz', sub: 'Test your knowledge on a topic', action: () => navigate('/quiz') };
  if (streak === 0) {
    nextAction = { icon: '🧠', text: 'Complete brain workout', sub: 'Keep your streak alive', action: () => navigate('/workout') };
  } else if (!hasTopics && questions > 0) {
    nextAction = { icon: '📝', text: 'Generate your first quiz', sub: 'Track your topic performance', action: () => navigate('/quiz') };
  } else if (hasTopics) {
    nextAction = { icon: '🃏', text: `Review flashcards for "${topics[0]?.name}"`, sub: 'Reinforce what you know', action: () => navigate('/flashcards') };
  }

  return (
    <div className={styles.panel}>
      {/* Next best action */}
      <div className={styles.nextAction} onClick={nextAction.action}>
        <span className={styles.nextIcon}>{nextAction.icon}</span>
        <div>
          <p className={styles.nextTitle}>Next: {nextAction.text}</p>
          <p className={styles.nextSub}>{nextAction.sub}</p>
        </div>
        <span className={styles.nextArrow}>→</span>
      </div>

      <div className={styles.twoCol}>
        {/* Topic analysis */}
        <div className={styles.section}>
          <p className={styles.sectionTitle}>📊 Topic Activity</p>
          {!hasTopics ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyIcon}>📭</p>
              <p className={styles.emptyText}>No topic data yet.</p>
              <p className={styles.emptyHint}>Ask a question, then generate a quiz from it to see topic insights here.</p>
            </div>
          ) : (
            topics.map(t => (
              <TopicBar key={t.name} topic={t.name} accuracy={0} attempted={false} />
            ))
          )}
        </div>

        {/* Recommendations */}
        <div className={styles.section}>
          <p className={styles.sectionTitle}>💡 Recommendations</p>
          <div className={styles.recList}>
            {recs.slice(0, 3).map((r, i) => (
              <button key={i} className={styles.recItem} onClick={r.action}>
                <span className={styles.recIcon}>{r.icon}</span>
                <span className={styles.recText}>{r.text}</span>
                <span className={styles.recArrow}>→</span>
              </button>
            ))}
          </div>

          {hasTopics && (
            <div className={styles.summary}>
              <div className={styles.summaryBlock}>
                <p className={styles.summaryLabel} style={{ color: '#4f46e5' }}>📚 Topics Studied</p>
                {topics.slice(0, 4).map(t => (
                  <p key={t.name} className={styles.summaryItem}>
                    {t.name} <span className={styles.sessionCount}>({t.sessions} session{t.sessions !== 1 ? 's' : ''})</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
