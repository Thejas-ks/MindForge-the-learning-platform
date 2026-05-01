import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    try {
      const { exp } = JSON.parse(atob(token.split('.')[1]));
      if (exp * 1000 < Date.now()) {
        removeToken();
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please log in again.'));
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
export const googleLogin = (credential) => api.post('/api/auth/google', { credential });

// AI
export const askQuestion = (data) => api.post('/api/ai/ask', data);
export const askFromFile = (formData) =>
  api.post('/api/ai/ask-file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const generateQuiz = (questionId, count = 5) => api.post(`/api/quiz/generate/${questionId}?count=${count}`);
export const generateQuizFromTopic = (topic, count = 5) => api.post(`/api/quiz/generate-topic?count=${count}`, { topic });
export const generateFlashcards = (questionId, count = 5) => api.post(`/api/flashcard/generate/${questionId}?count=${count}`);
export const generateFlashcardsFromTopic = (topic, count = 5) => api.post(`/api/flashcard/generate-topic?count=${count}`, { topic });
export const quizFromFile = (formData, count = 5) =>
  api.post(`/api/quiz/upload?count=${count}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 });
export const flashcardsFromFile = (formData, count = 5) =>
  api.post(`/api/flashcard/upload?count=${count}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 });
export const getHistory = () => api.get('/api/ai/history');
export const deleteHistoryItem = (id) => api.delete(`/api/ai/history/${id}`);
export const deleteAllHistory = () => api.delete('/api/ai/history');
export const getQuizHistory = () => api.get('/api/quiz/history');
export const deleteQuizByTopic = (questionId) => api.delete(`/api/quiz/history/${questionId}`);
export const deleteAllQuizHistory = () => api.delete('/api/quiz/history');
export const getFlashcardHistory = () => api.get('/api/flashcard/history');
export const deleteFlashcardByTopic = (questionId) => api.delete(`/api/flashcard/history/${questionId}`);
export const deleteAllFlashcardHistory = () => api.delete('/api/flashcard/history');

// Workout
export const getWorkoutToday = () => api.get('/api/workout/today');
export const getWorkoutPractice = () => api.get('/api/workout/practice');
export const submitWorkout = (data) => api.post('/api/workout/submit', data);
export const getStreak = () => api.get('/api/workout/streak');

// Chat (continuous conversation)
export const chatSend = (data) => api.post('/api/chat/send', data);
export const chatHistory = (conversationId) => api.get(`/api/chat/history/${conversationId}`);
export const chatConversations = () => api.get('/api/chat/conversations');
export const chatDeleteConversation = (conversationId) => api.delete(`/api/chat/conversations/${conversationId}`);
export const extractChatFile = (formData) =>
  api.post('/api/chat/extract-file', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 });

export default api;
