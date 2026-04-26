import { createRoot } from 'react-dom/client';
import './styles/theme.css';
import App from './App.jsx';
import { ThemeProvider } from './utils/ThemeContext.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </GoogleOAuthProvider>
);
