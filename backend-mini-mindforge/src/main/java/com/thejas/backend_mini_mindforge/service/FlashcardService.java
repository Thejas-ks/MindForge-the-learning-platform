package com.thejas.backend_mini_mindforge.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thejas.backend_mini_mindforge.entity.Flashcard;
import com.thejas.backend_mini_mindforge.repository.FlashcardRepository;
import com.thejas.backend_mini_mindforge.repository.QuestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class FlashcardService {

    private final AiService aiService;
    private final FlashcardRepository flashcardRepository;
    private final QuestionRepository questionRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public FlashcardService(AiService aiService,
                            FlashcardRepository flashcardRepository,
                            QuestionRepository questionRepository) {
        this.aiService = aiService;
        this.flashcardRepository = flashcardRepository;
        this.questionRepository = questionRepository;
    }

    @Transactional
    public List<Flashcard> generateFromTopic(String topic, String email, int count) {
        return generateAndSave(topic, null, email, count);
    }

    @Transactional
    public List<Flashcard> generateFromAnswer(Long questionId, String email, int count) {
        String answerText = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found with id: " + questionId))
                .getAnswer();
        return generateAndSave(answerText, questionId, email, count);
    }

    @Transactional
    public List<Flashcard> generateFromText(String extractedText, String email, int count) {
        return generateAndSave(extractedText, null, email, count);
    }

    private List<Flashcard> generateAndSave(String text, Long questionId, String email, int count) {
        int safeCount = Math.max(1, Math.min(count, 20));
        String aiResponse = aiService.generateFlashcards(text, safeCount);
        String cleanJson = cleanJson(aiResponse);

        try {
            List<Map<String, String>> parsed = objectMapper.readValue(
                    cleanJson, new TypeReference<List<Map<String, String>>>() {}
            );

            List<Flashcard> flashcards = new ArrayList<>();
            for (Map<String, String> item : parsed) {
                Flashcard f = new Flashcard();
                f.setEmail(email);
                f.setQuestionId(questionId);
                f.setFront(item.get("front"));
                f.setBack(item.get("back"));
                flashcards.add(f);
            }

            return flashcardRepository.saveAll(flashcards);

        } catch (Exception e) {
            throw new RuntimeException("Failed to parse flashcards from AI response: " + e.getMessage());
        }
    }

    public List<Flashcard> getHistory(String email) {
        return flashcardRepository.findByEmail(email);
    }

    @Transactional
    public void deleteByTopic(Long questionId, String email) {
        flashcardRepository.deleteByQuestionIdAndEmail(questionId, email);
    }

    @Transactional
    public void deleteAll(String email) {
        flashcardRepository.deleteByEmail(email);
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
