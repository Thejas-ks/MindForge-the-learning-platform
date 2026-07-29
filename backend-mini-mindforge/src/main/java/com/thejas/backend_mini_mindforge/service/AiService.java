package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.ai.provider.AIProvider;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

@Service
public class AiService {

    private static final Logger log = Logger.getLogger(AiService.class.getName());

    private final AIProvider aiProvider;

    public AiService(@Qualifier("groqProvider") AIProvider aiProvider) {
        this.aiProvider = aiProvider;
    }

    @PostConstruct
    public void init() {
        log.info("=== AiService started — provider: " + aiProvider.getClass().getSimpleName() + " ===");
    }

    public String generateAnswer(String question) {
        return aiProvider.generateAnswer(question);
    }

    public String generateAnswerWithHistory(String question, List<Map<String, String>> history) {
        return aiProvider.generateAnswerWithHistory(question, history);
    }

    public String generateQuiz(String content, int count) {
        return aiProvider.generateQuiz(content, count);
    }

    public String generateFlashcards(String content, int count) {
        return aiProvider.generateFlashcards(content, count);
    }
}
