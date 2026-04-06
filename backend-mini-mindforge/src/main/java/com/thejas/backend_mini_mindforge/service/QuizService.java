package com.thejas.backend_mini_mindforge.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thejas.backend_mini_mindforge.entity.QuizQuestion;
import com.thejas.backend_mini_mindforge.repository.QuizQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.QuestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class QuizService {

    private final AiService aiService;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuestionRepository questionRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public QuizService(AiService aiService,
                       QuizQuestionRepository quizQuestionRepository,
                       QuestionRepository questionRepository) {
        this.aiService = aiService;
        this.quizQuestionRepository = quizQuestionRepository;
        this.questionRepository = questionRepository;
    }

    @Transactional
    public List<QuizQuestion> generateFromAnswer(Long questionId, String email, int count) {
        String answerText = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found with id: " + questionId))
                .getAnswer();
        return generateAndSave(answerText, questionId, email, count);
    }

    @Transactional
    public List<QuizQuestion> generateFromText(String extractedText, String email, int count) {
        return generateAndSave(extractedText, null, email, count);
    }

    private List<QuizQuestion> generateAndSave(String text, Long questionId, String email, int count) {
        int safeCount = Math.max(1, Math.min(count, 20));
        String aiResponse = aiService.generateQuiz(text, safeCount);
        String cleanJson = cleanJson(aiResponse);

        try {
            List<Map<String, String>> parsed = objectMapper.readValue(
                    cleanJson, new TypeReference<List<Map<String, String>>>() {}
            );

            List<QuizQuestion> quizQuestions = new ArrayList<>();
            for (Map<String, String> item : parsed) {
                QuizQuestion q = new QuizQuestion();
                q.setEmail(email);
                q.setQuestionId(questionId);
                q.setQuestion(item.get("question"));
                q.setOptionA(item.get("optionA"));
                q.setOptionB(item.get("optionB"));
                q.setOptionC(item.get("optionC"));
                q.setOptionD(item.get("optionD"));
                q.setCorrectAnswer(item.get("correctAnswer"));
                quizQuestions.add(q);
            }

            return quizQuestionRepository.saveAll(quizQuestions);

        } catch (Exception e) {
            throw new RuntimeException("Failed to parse quiz from AI response: " + e.getMessage());
        }
    }

    public List<QuizQuestion> getHistory(String email) {
        return quizQuestionRepository.findByEmail(email);
    }

    private String cleanJson(String raw) {
        String cleaned = raw.trim();
        cleaned = cleaned.replaceAll("(?s)^```[a-zA-Z]*\\s*", "").replaceAll("\\s*```$", "").trim();
        int start = cleaned.indexOf('[');
        int end = cleaned.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            cleaned = cleaned.substring(start, end + 1);
        }
        return cleaned;
    }
}
