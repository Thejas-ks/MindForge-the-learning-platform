import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated } from './utils/auth';
import { useTheme } from './utils/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AskQuestion from './pages/AskQuestion';
import UploadNotes from './pages/UploadNotes';
import QuizPage from './pages/QuizPage';
import FlashcardsPage from './pages/FlashcardsPage';
import History from './pages/History';
import BrainWorkout from './pages/BrainWorkout';

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  return !isAuthenticated() ? children : <Navigate to="/dashboard" replace />;
}

function AppToaster() {
  const { dark } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: dark ? '#1e293b' : '#ffffff',
          color: dark ? '#f1f5f9' : '#111827',
          border: `1px solid ${dark ? '#2d3f55' : '#e5e7eb'}`,
          borderRadius: '12px',
          fontSize: '0.875rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        },
        success: { iconTheme: { primary: '#10b981', secondary: dark ? '#1e293b' : '#fff' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: dark ? '#1e293b' : '#fff' } },
      }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppToaster />
      <Routes>
        <Route path="/"           element={<Navigate to="/dashboard" replace />} />
        <Route path="/login"      element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register"   element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/ask"        element={<PrivateRoute><AskQuestion /></PrivateRoute>} />
        <Route path="/upload"     element={<PrivateRoute><UploadNotes /></PrivateRoute>} />
        <Route path="/history"    element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/quiz"       element={<PrivateRoute><QuizPage /></PrivateRoute>} />
        <Route path="/flashcards" element={<PrivateRoute><FlashcardsPage /></PrivateRoute>} />
        <Route path="/workout"    element={<PrivateRoute><BrainWorkout /></PrivateRoute>} />
        <Route path="*"           element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
