import { NavLink, useNavigate } from 'react-router-dom';
import { removeToken } from '../utils/auth';
import { getUser } from '../utils/auth';
import { useTheme } from '../utils/ThemeContext';
import styles from './Navbar.module.css';

const navLinks = [
  { to: '/dashboard', label: 'Home' },
  { to: '/ask', label: 'Ask AI' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/flashcards', label: 'Flashcards' },
  { to: '/workout', label: 'Brain Workout' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();
  const { dark, toggle } = useTheme();

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>

        <div className={styles.left}>
          <NavLink to="/dashboard" className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            <span className={styles.logoText}>MindForge</span>
          </NavLink>
        </div>

        <nav className={styles.center}>
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.right}>
          <NavLink to="/upload" className={styles.uploadBtn}>
            + Upload Notes
          </NavLink>
          <NavLink to="/history" className={styles.historyBtn}>
            History
          </NavLink>

          {/* Dark mode toggle */}
          <button
            className={styles.themeToggle}
            onClick={toggle}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            <span className={`${styles.toggleTrack} ${dark ? styles.toggleTrackDark : ''}`}>
              <span className={`${styles.toggleThumb} ${dark ? styles.toggleThumbDark : ''}`}>
                <span className={styles.toggleIcon}>{dark ? '🌙' : '☀️'}</span>
              </span>
            </span>
          </button>

          <button className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
          <div className={styles.avatar} title={user?.sub}>
            {(user?.sub || 'U')[0].toUpperCase()}
          </div>
        </div>

      </div>
    </header>
  );
}
