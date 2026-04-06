import styles from './ResponseViewer.module.css';

export default function ResponseViewer({ content, title }) {
  if (!content) return null;
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  return (
    <div className={styles.wrapper}>
      {title && <p className={styles.title}>{title}</p>}
      <pre className={styles.pre}>{text}</pre>
    </div>
  );
}
