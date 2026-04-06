package com.thejas.backend_mini_mindforge.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.util.*;

@Service
public class AiService {

    private static final int MAX_INPUT_LENGTH = 1000;
    private static final int MAX_ANSWER_TOKENS = 600;
    private static final int MAX_JSON_TOKENS = 1500;
    private static final double TEMPERATURE = 0.4;

    // gemini-2.0-flash is the current stable free-tier model
    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=";

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate;

    public AiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String generateAnswer(String question) {
        String trimmed = trim(question, MAX_INPUT_LENGTH);
        String prompt = "Answer the following question clearly and completely. " +
                "Structure your response with a brief intro, key points as bullet points, " +
                "and a short summary. Do not cut the explanation mid-sentence.\n\nQuestion: " + trimmed;
        String raw = callGemini(prompt, false, MAX_ANSWER_TOKENS);
        return formatAnswer(raw);
    }

    public String generateQuiz(String answerText, int count) {
        String trimmed = trim(answerText, MAX_INPUT_LENGTH);
        String prompt = "Generate exactly " + count + " complete multiple choice questions from the content below. " +
                "Each question must have 4 options (A, B, C, D) and a correctAnswer (A/B/C/D). " +
                "Return a complete JSON array only. Keys: question, optionA, optionB, optionC, optionD, correctAnswer. " +
                "Every entry must be fully written. Do not stop before completing all " + count + " items.\n\nContent:\n" + trimmed;
        return callGemini(prompt, true, MAX_JSON_TOKENS);
    }

    public String generateFlashcards(String answerText, int count) {
        String trimmed = trim(answerText, MAX_INPUT_LENGTH);
        String prompt = "Generate exactly " + count + " flashcards from the content below. " +
                "Return a complete JSON array only. Keys: front (term or concept), back (full definition or explanation). " +
                "Every entry must be complete. Do not stop before completing all " + count + " items.\n\nContent:\n" + trimmed;
        return callGemini(prompt, true, MAX_JSON_TOKENS);
    }

    private String callGemini(String prompt, boolean forceJson, int maxTokens) {
        String url = GEMINI_URL + apiKey;

        Map<String, Object> part = Map.of("text", prompt);
        Map<String, Object> content = Map.of("parts", List.of(part));

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("maxOutputTokens", maxTokens);
        generationConfig.put("temperature", TEMPERATURE);
        if (forceJson) {
            generationConfig.put("responseMimeType", "application/json");
        }

        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(content));
        body.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.POST, request,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> responseBody = response.getBody();

            if (responseBody == null
                    || !(responseBody.get("candidates") instanceof List<?> candidates)
                    || candidates.isEmpty()
                    || !(candidates.get(0) instanceof Map<?, ?> first)
                    || !(first.get("content") instanceof Map<?, ?> contentMap)
                    || !(contentMap.get("parts") instanceof List<?> parts)
                    || parts.isEmpty()
                    || !(parts.get(0) instanceof Map<?, ?> textPart)) {
                throw new RuntimeException("Unexpected response structure from AI service");
            }

            Object finishReason = first.get("finishReason");
            Object text = textPart.get("text");
            String result = text != null ? text.toString().trim() : "";

            if (result.isEmpty()) {
                throw new RuntimeException("AI returned an empty response");
            }

            if ("MAX_TOKENS".equals(finishReason) && !forceJson) {
                result += "\n\n[Note: Response was trimmed. Try asking a more specific question.]";
            }

            return result;

        } catch (ResourceAccessException e) {
            throw new RuntimeException("AI service timed out. Please try again in a moment.");
        } catch (RestClientException e) {
            throw new RuntimeException("AI service is currently unavailable: " + e.getMessage());
        }
    }

    private String formatAnswer(String raw) {
        if (raw == null) return "";
        return raw
                .replaceAll("\\n{3,}", "\n\n")
                .replaceAll("(?m)^([•\\-\\*])\\s+", "\n• ")
                .replaceAll("(?m)^(\\d+\\.\\s)", "\n$1")
                .trim();
    }

    private String trim(String input, int maxLength) {
        if (input == null) return "";
        String trimmed = input.trim();
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }
}
