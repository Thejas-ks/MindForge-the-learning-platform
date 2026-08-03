package com.thejas.backend_mini_mindforge.ai.provider;

import java.util.List;
import java.util.Map;

public interface AIProvider {

    String generateAnswer(String question);

    String generateAnswerWithHistory(String question, List<Map<String, String>> history);

    String generateQuiz(String content, int count);

    String generateFlashcards(String content, int count);
}
