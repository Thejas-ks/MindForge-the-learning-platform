import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, googleLogin } from '../services/api';
import { setToken } from '../utils/auth';
import { getErrorMessage } from '../utils/errorHandler';
import { useGoogleLogin } from '@react-oauth/google';
import { MindForgeLogoFull } from '../components/MindForgeLogo';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form);
      const token = res.data.data;
      if (!token) { toast.error(res.data.message || 'Login failed'); return; }
      setToken(token);
      toast.success('Welcome back!');
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(getErrorMessage(err));
      setLoading(false);
    }
  };

  const handleGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGLoading(true);
      try {
        // Exchange access token for id_token via userinfo, then send to backend
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(r => r.json());
        const res = await googleLogin(tokenResponse.access_token);
        const token = res.data.data;
        if (!token) { toast.error(res.data.message || 'Google login failed'); return; }
        setToken(token);
        toast.success(`Welcome, ${userInfo.name || 'there'}!`);
        window.location.href = '/dashboard';
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setGLoading(false);
      }
    },
    onError: () => toast.error('Google sign-in was cancelled or failed.'),
  });

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <MindForgeLogoFull size={38} textSize={22} />
        </div>
        <p className={styles.subtitle}>Sign in to continue learning</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" placeholder="Enter your email"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input type="password" placeholder="Enter your password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <Button type="submit" disabled={loading || gLoading} fullWidth>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className={styles.divider}><span>or</span></div>

        <button className={styles.googleBtn} onClick={() => handleGoogle()} disabled={loading || gLoading}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {gLoading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <p className={styles.switch}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
