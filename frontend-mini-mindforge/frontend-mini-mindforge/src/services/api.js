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
  api.post('/api/ai/ask-file', formData, { headers: { 'Content-Type': undefined } });
export const generateQuiz = (questionId, count = 5) => api.post(`/api/quiz/generate/${questionId}?count=${count}`);
export const generateQuizFromTopic = (topic, count = 5) => api.post(`/api/quiz/generate-topic?count=${count}`, { topic });
export const generateFlashcards = (questionId, count = 5) => api.post(`/api/flashcard/generate/${questionId}?count=${count}`);
export const generateFlashcardsFromTopic = (topic, count = 5) => api.post(`/api/flashcard/generate-topic?count=${count}`, { topic });
export const quizFromFile = (formData, count = 5) =>
  api.post(`/api/quiz/upload?count=${count}`, formData, { headers: { 'Content-Type': undefined }, timeout: 180000 });
export const flashcardsFromFile = (formData, count = 5) =>
  api.post(`/api/flashcard/upload?count=${count}`, formData, { headers: { 'Content-Type': undefined }, timeout: 180000 });
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
  api.post('/api/notes/upload', formData, { headers: { 'Content-Type': undefined }, timeout: 180000 });

export default api;

// ─── Examination ─────────────────────────────────────────────────────────────

// Question Bank
export const createQuestion       = (data) => api.post('/api/question-bank', data);
export const createQuestionDraft  = (data) => api.post('/api/question-bank/draft', data);
export const finalizeQuestionDraft = (id, data) => api.post(`/api/question-bank/${id}/finalize`, data);
export const getQuestions         = (params) => api.get('/api/question-bank', { params });
export const getQuestionDrafts    = (params) => api.get('/api/question-bank/drafts', { params });
export const getQuestionById      = (id) => api.get(`/api/question-bank/${id}`);
export const updateQuestion       = (id, data) => api.put(`/api/question-bank/${id}`, data);
export const deleteQuestion       = (id) => api.delete(`/api/question-bank/${id}`);

// Exams
export const createExam        = (data) => api.post('/api/exams', data);
export const getExams          = () => api.get('/api/exams');
export const getPublishedExams = () => api.get('/api/exams/published');
export const getExamById       = (id) => api.get(`/api/exams/${id}`);
export const getExamPreview    = (id) => api.get(`/api/exams/${id}/preview`);
export const updateExam        = (id, data) => api.put(`/api/exams/${id}`, data);
export const publishExam       = (id) => api.post(`/api/exams/${id}/publish`);
export const archiveExam       = (id) => api.post(`/api/exams/${id}/archive`);
export const deleteExam        = (id) => api.delete(`/api/exams/${id}`);

// Exam Questions
export const addQuestionsToExam      = (examId, data) => api.post(`/api/exams/${examId}/questions`, data);
export const addSingleQuestionToExam = (examId, data) => api.post(`/api/exams/${examId}/questions/single`, data);
export const bulkCreateAndAssign     = (examId, data) => api.post(`/api/exams/${examId}/questions/bulk-create`, data);
export const finalizeAndAssign       = (examId, data) => api.post(`/api/exams/${examId}/questions/finalize-and-assign`, data);
export const saveDraftQuestions      = (examId, data) => api.post(`/api/exams/${examId}/questions/save-drafts`, data);
export const getExamQuestions        = (examId) => api.get(`/api/exams/${examId}/questions`);
export const updateExamQuestion      = (examId, eqId, data) => api.patch(`/api/exams/${examId}/questions/${eqId}`, data);
export const removeExamQuestion      = (examId, bqId) => api.delete(`/api/exams/${examId}/questions/${bqId}`);

// Attempts
export const startExam          = (examId) => api.post(`/api/exams/${examId}/start`);
export const getMyAttempts      = () => api.get('/api/my-attempts');
export const getAttemptById     = (attemptId) => api.get(`/api/attempts/${attemptId}`);
export const submitAttempt      = (attemptId) => api.post(`/api/attempts/${attemptId}/submit`);
export const getAttemptQuestions = (attemptId) => api.get(`/api/attempts/${attemptId}/questions`);
export const getAttemptAnswers  = (attemptId) => api.get(`/api/attempts/${attemptId}/answers`);
export const saveAttemptAnswer  = (attemptId, questionId, data) => api.put(`/api/attempts/${attemptId}/answers/${questionId}`, data);
export const evaluateAttempt    = (attemptId) => api.post(`/api/attempts/${attemptId}/evaluate`);

// Teacher Results
export const getExamAttempts        = (examId)    => api.get(`/api/exams/${examId}/attempts`);
export const getTeacherAttempt      = (attemptId) => api.get(`/api/teacher/attempts/${attemptId}`);
export const getTeacherAttemptAnswers = (attemptId) => api.get(`/api/teacher/attempts/${attemptId}/answers`);

