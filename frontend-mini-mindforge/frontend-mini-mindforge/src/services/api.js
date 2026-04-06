import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';

const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    try {
      const { exp } = JSON.parse(atob(token.split('.')[1]));
      if (exp * 1000 < Date.now()) {
        removeToken();
        window.location.href = '/login';
        return Promise.reject(new Error('Token expired'));
      }
    } catch {}
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => api.post('/api/auth/login', data);
export const register = (data) => api.post('/api/auth/register', data);

// AI
export const askQuestion = (data) => api.post('/api/ai/ask', data);
export const generateQuiz = (questionId, count = 5) => api.post(`/api/quiz/generate/${questionId}?count=${count}`);
export const generateFlashcards = (questionId, count = 5) => api.post(`/api/flashcard/generate/${questionId}?count=${count}`);
export const quizFromFile = (formData, count = 5) =>
  api.post(`/api/quiz/upload?count=${count}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const flashcardsFromFile = (formData, count = 5) =>
  api.post(`/api/flashcard/upload?count=${count}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getHistory = () => api.get('/api/ai/history');
export const getQuizHistory = () => api.get('/api/quiz/history');
export const getFlashcardHistory = () => api.get('/api/flashcard/history');

// Workout
export const getWorkoutToday = () => api.get('/api/workout/today');
export const getWorkoutPractice = () => api.get('/api/workout/practice');
export const submitWorkout = (data) => api.post('/api/workout/submit', data);
export const getStreak = () => api.get('/api/workout/streak');

export default api;
