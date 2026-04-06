import styles from './Card.module.css';

export default function Card({ children, className = '', onClick, hoverable }) {
  return (
    <div
      className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
