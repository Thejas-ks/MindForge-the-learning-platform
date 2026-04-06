import { useState } from 'react';
import styles from './FlashcardViewer.module.css';

const GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #7dd3fc, #0ea5e9)',
  'linear-gradient(135deg, #c084fc, #a855f7)',
  'linear-gradient(135deg, #fdba74, #f97316)',
  'linear-gradient(135deg, #6ee7b7, #10b981)',
  'linear-gradient(135deg, #fda4af, #f43f5e)',
];

export default function FlashcardViewer({ cards }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards || cards.length === 0) return null;

  const card = cards[index];
  const front = card.front || card.term || card.question || card.concept || '';
  const back = card.back || card.definition || card.answer || card.explanation || '';
  const gradient = GRADIENTS[index % GRADIENTS.length];

  const goNext = () => { setIndex(i => i + 1); setFlipped(false); };
  const goPrev = () => { setIndex(i => i - 1); setFlipped(false); };

  return (
    <div className={styles.viewer}>
      {/* Progress */}
      <div className={styles.progress}>
        <span className={styles.counter}>Card {index + 1} of {cards.length}</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className={`${styles.card} ${flipped ? styles.flipped : ''}`} onClick={() => setFlipped(f => !f)}>
        <div className={styles.cardInner}>
          {/* Front */}
          <div className={styles.cardFront} style={{ background: gradient }}>
            <span className={styles.sideLabel}>Question</span>
            <p className={styles.cardText}>{front}</p>
            <span className={styles.tapHint}>Tap to reveal answer</span>
          </div>
          {/* Back */}
          <div className={styles.cardBack}>
            <span className={styles.sideLabel}>Answer</span>
            <p className={styles.cardText}>{back}</p>
            <span className={styles.tapHint}>Tap to flip back</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className={styles.nav}>
        <button className={styles.navBtn} onClick={goPrev} disabled={index === 0}>← Prev</button>
        <div className={styles.dots}>
          {cards.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
              onClick={() => { setIndex(i); setFlipped(false); }}
            />
          ))}
        </div>
        <button className={styles.navBtn} onClick={goNext} disabled={index === cards.length - 1}>Next →</button>
      </div>
    </div>
  );
}
