/**
 * Centralized error handler — maps technical errors to user-friendly messages.
 * Use getErrorMessage(err) everywhere instead of err.response?.data?.message
 */

const AI_KEYWORDS = ['quota', '429', 'rate limit', 'resource_exhausted', 'too many requests', 'daily limit', 'sambanova', 'ai service', 'authentication failed', 'api key', 'ai rate limit'];

export function getErrorMessage(err) {
  // Network error — no response at all
  if (!err.response) {
    if (err.message?.toLowerCase().includes('network')) {
      return 'Check your internet connection and try again.';
    }
    if (err.message?.toLowerCase().includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    return 'Unable to connect to the server. Please try again.';
  }

  const status = err.response?.status;
  const serverMsg = (err.response?.data?.message || err.response?.data || '').toString().toLowerCase();

  // AI-specific errors
  if (AI_KEYWORDS.some(k => serverMsg.includes(k))) {
    return 'AI usage limit reached. Please try again in a few moments.';
  }

  // HTTP status codes
  switch (status) {
    case 400: return 'Please check your input and try again.';
    case 401: return 'Your session expired. Please log in again.';
    case 403: return "You don't have permission to perform this action.";
    case 404: return "We couldn't find what you're looking for.";
    case 408: return 'The request timed out. Please try again.';
    case 413: return 'The file is too large. Maximum size is 10MB.';
    case 429: return 'Too many requests. Please wait a moment and try again.';
    case 500: {
      const msg500 = (err.response?.data?.message || '').toString();
      if (msg500.includes('Quiz parse failed')) return 'Quiz generation failed — AI returned unexpected format. Please try again.';
      if (msg500.includes('AI service')) return msg500;
      return 'Something went wrong on our side. Please try again later.';
    }
    case 502:
    case 503:
    case 504: return 'The service is temporarily unavailable. Please try again later.';
    default:  return 'Something went wrong. Please try again.';
  }
}

// AI-specific error check
export function isAiError(err) {
  const msg = (err.response?.data?.message || '').toString().toLowerCase();
  return AI_KEYWORDS.some(k => msg.includes(k));
}

// Form validation helper
export function getValidationMessage(field) {
  const messages = {
    email: 'Please enter a valid email address.',
    password: 'Password must be at least 6 characters.',
    name: 'Please enter your name.',
    question: 'Please enter a question.',
    questionId: 'Please enter a valid Question ID.',
    file: 'Please select a valid file (PDF or TXT).',
  };
  return messages[field] || 'Please check your input and try again.';
}
