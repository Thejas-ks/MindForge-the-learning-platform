package com.thejas.backend_mini_mindforge.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thejas.backend_mini_mindforge.entity.QuizQuestion;
import com.thejas.backend_mini_mindforge.repository.QuizQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.QuestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

@Service
public class QuizService {

    private static final Logger log = Logger.getLogger(QuizService.class.getName());

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
    public List<QuizQuestion> generateFromTopic(String topic, String email, int count) {
        return generateAndSave(topic, null, email, count);
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
        log.info("[QuizService] Raw AI response: " + aiResponse);

        String cleanJson = cleanJson(aiResponse);
        log.info("[QuizService] Cleaned JSON: " + cleanJson);

        try {
            List<Map<String, Object>> parsed = objectMapper.readValue(
                    cleanJson, new TypeReference<List<Map<String, Object>>>() {}
            );

            List<QuizQuestion> quizQuestions = new ArrayList<>();
            for (Map<String, Object> item : parsed) {
                QuizQuestion q = new QuizQuestion();
                q.setEmail(email);
                q.setQuestionId(questionId);
                q.setQuestion(str(item, "question"));
                q.setOptionA(str(item, "optionA"));
                q.setOptionB(str(item, "optionB"));
                q.setOptionC(str(item, "optionC"));
                q.setOptionD(str(item, "optionD"));
                q.setCorrectAnswer(str(item, "correctAnswer"));
                q.setExplanation(str(item, "explanation"));
                quizQuestions.add(q);
            }

            log.info("[QuizService] Parsed " + quizQuestions.size() + " questions successfully");
            return quizQuestionRepository.saveAll(quizQuestions);

        } catch (Exception e) {
            log.severe("[QuizService] Parse failed. Cleaned JSON was: " + cleanJson);
            log.severe("[QuizService] Parse error: " + e.getMessage());
            throw new RuntimeException("Quiz parse failed: " + e.getMessage() + " | Raw: " + aiResponse.substring(0, Math.min(200, aiResponse.length())));
        }
    }

    public List<QuizQuestion> getHistory(String email) {
        return quizQuestionRepository.findByEmail(email);
    }

    @Transactional
    public void deleteByTopic(Long questionId, String email) {
        quizQuestionRepository.deleteByQuestionIdAndEmail(questionId, email);
    }

    @Transactional
    public void deleteAll(String email) {
        quizQuestionRepository.deleteByEmail(email);
    }

    /** Safely extract a string value from a map regardless of actual type */
    private String str(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return null;
        if (val instanceof String) return (String) val;
        // Handle case where AI returns a list for explanation
        if (val instanceof List) {
            List<?> list = (List<?>) val;
            StringBuilder sb = new StringBuilder();
            for (Object item : list) sb.append(item).append(" ");
            return sb.toString().trim();
        }
        return val.toString();
    }

    /**
     * Strips markdown fences and extracts the JSON array.
     * Handles both bare arrays [...] and wrapped objects {"questions":[...]}
     */
    private String cleanJson(String raw) {
        String s = raw.trim();
        // Strip markdown code fences
        s = s.replaceAll("(?s)^```[a-zA-Z]*\\s*", "").replaceAll("(?s)\\s*```$", "").trim();

        // If wrapped in object like {"questions":[...]}, extract the array
        if (s.startsWith("{")) {
            try {
                JsonNode node = objectMapper.readTree(s);
                // Try common wrapper keys
                for (String key : new String[]{"questions", "quiz", "mcqs", "items", "data"}) {
                    if (node.has(key) && node.get(key).isArray()) {
                        return node.get(key).toString();
                    }
                }
                // If only one field and it's an array, use it
                if (node.size() == 1) {
                    JsonNode first = node.fields().next().getValue();
                    if (first.isArray()) return first.toString();
                }
            } catch (Exception ignored) {}
        }

        // Extract bare array
        int start = s.indexOf('[');
        int end = s.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            return s.substring(start, end + 1);
        }
        return s;
    }
}
