import { NavLink, useNavigate } from 'react-router-dom';
import { removeToken } from '../utils/auth';
import styles from './Sidebar.module.css';

const links = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/ask', icon: '💬', label: 'Ask Question' },
  { to: '/upload', icon: '📄', label: 'Upload Notes' },
  { to: '/quiz', icon: '📝', label: 'Quiz' },
  { to: '/flashcards', icon: '🃏', label: 'Flashcards' },
  { to: '/workout', icon: '🧠', label: 'Brain Workout' },
  { to: '/history', icon: '🕘', label: 'History' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>⚡</span>
        <span className={styles.logoText}>MindForge</span>
      </div>

      <nav className={styles.nav}>
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.icon}>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button className={styles.logout} onClick={handleLogout}>
        <span>↩</span>
        <span>Logout</span>
      </button>
    </aside>
  );
}
