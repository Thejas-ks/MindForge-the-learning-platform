import styles from './Button.module.css';

export default function Button({ children, onClick, disabled, variant = 'primary', type = 'button', fullWidth }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${styles.btn} ${styles[variant]} ${fullWidth ? styles.full : ''}`}
    >
      {children}
    </button>
  );
}
