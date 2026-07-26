package com.thejas.backend_mini_mindforge.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.logging.Logger;

@Service
public class AiService {

    private static final Logger log = Logger.getLogger(AiService.class.getName());

    private static final String SAMBA_URL = "https://api.sambanova.ai/v1/chat/completions";
    private static final String SAMBA_MODEL = "Meta-Llama-3.3-70B-Instruct";

    @Value("${sambanova.api.key}")
    private String sambaKey;

    private final RestTemplate restTemplate;

    public AiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void init() {
        log.info("=== AiService Started (SambaNova) ===");
        log.info("SambaNova key: " + (sambaKey != null && !sambaKey.isBlank()
                ? "YES ends with ..." + sambaKey.substring(Math.max(0, sambaKey.length() - 4))
                : "MISSING!"));
    }

    // ─── PUBLIC API ───────────────────────────────────────────────────────────

    public String generateAnswer(String question) {
        String prompt = "Answer this question clearly with bullet points and a summary.\n\nQuestion: " + trim(question, 800);
        return formatAnswer(call(prompt, null));
    }

    public String generateAnswerWithHistory(String question, List<Map<String, String>> history) {
        String prompt = "Answer this question clearly with bullet points and a summary.\n\nQuestion: " + trim(question, 800);
        return formatAnswer(call(prompt, history));
    }

    public String generateQuiz(String content, int count) {
        String prompt = "You are a quiz generator. Generate exactly " + count + " multiple choice questions.\n" +
                "Topic/Content: " + trim(content, 1500) + "\n\n" +
                "Rules:\n" +
                "- Return ONLY a valid JSON array. No extra text, no markdown, no code blocks.\n" +
                "- Each element must have EXACTLY these keys: question, optionA, optionB, optionC, optionD, correctAnswer, explanation\n" +
                "- correctAnswer must be exactly one of: A, B, C, or D\n" +
                "- explanation must be a plain string (1-2 sentences)\n\n" +
                "Example output format:\n" +
                "[{\"question\":\"What is X?\",\"optionA\":\"...\",\"optionB\":\"...\",\"optionC\":\"...\",\"optionD\":\"...\",\"correctAnswer\":\"A\",\"explanation\":\"...\"}]";
        return call(prompt, null);
    }

    public String generateFlashcards(String content, int count) {
        String prompt = "Generate exactly " + count + " flashcards from this content. " +
                "Return JSON array only. Keys: front (term), back (definition).\n\n" +
                trim(content, 800);
        return call(prompt, null);
    }

    // ─── SAMBANOVA CALL ───────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String call(String prompt, List<Map<String, String>> history) {
        try {
            log.info("[SambaNova] Sending request...");

            // Build messages list — system + history + current prompt
            List<Map<String, Object>> messages = new ArrayList<>();

            // System message
            Map<String, Object> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", "You are MindForge AI, a helpful learning assistant. Answer clearly and concisely.");
            messages.add(systemMsg);

            // Add conversation history (last 10 messages max)
            if (history != null && !history.isEmpty()) {
                int start = Math.max(0, history.size() - 10);
                for (int i = start; i < history.size(); i++) {
                    Map<String, String> h = history.get(i);
                    Map<String, Object> hMsg = new HashMap<>();
                    hMsg.put("role", h.getOrDefault("role", "user"));
                    hMsg.put("content", trim(h.getOrDefault("content", ""), 500));
                    messages.add(hMsg);
                }
            }

            // Current user message
            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", prompt);
            messages.add(userMsg);

            Map<String, Object> body = new HashMap<>();
            body.put("model", SAMBA_MODEL);
            body.put("messages", messages);
            body.put("max_tokens", 2048);
            body.put("temperature", 0.3);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(sambaKey);

            ResponseEntity<Map<String, Object>> res = restTemplate.exchange(
                    SAMBA_URL,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> rb = res.getBody();
            log.info("[SambaNova] Status: " + res.getStatusCode());
            log.info("[SambaNova] Body: " + rb);

            if (rb == null) throw new RuntimeException("Null response body");

            Object choicesObj = rb.get("choices");
            if (!(choicesObj instanceof List)) throw new RuntimeException("No choices in response");

            List<Object> choices = (List<Object>) choicesObj;
            if (choices.isEmpty()) throw new RuntimeException("Empty choices list");

            Object choiceObj = choices.get(0);
            if (!(choiceObj instanceof Map)) throw new RuntimeException("Invalid choice format");

            Map<String, Object> choice = (Map<String, Object>) choiceObj;
            Object msgObj = choice.get("message");
            if (!(msgObj instanceof Map)) throw new RuntimeException("No message in choice");

            Map<String, Object> msg = (Map<String, Object>) msgObj;
            Object content = msg.get("content");
            if (content == null || content.toString().isBlank())
                throw new RuntimeException("Empty content in response");

            log.info("[SambaNova] SUCCESS");
            return content.toString().trim();

        } catch (HttpClientErrorException e) {
            log.severe("[SambaNova] HTTP " + e.getStatusCode() + ": " + e.getResponseBodyAsString());
            if (e.getStatusCode().value() == 401 || e.getStatusCode().value() == 403) {
                throw new RuntimeException("AI service authentication failed. Please check the API key.");
            }
            if (e.getStatusCode().value() == 429) {
                throw new RuntimeException("AI rate limit reached. Please try again in a few moments.");
            }
            throw new RuntimeException("AI service error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
        } catch (ResourceAccessException e) {
            log.severe("[SambaNova] Timeout: " + e.getMessage());
            throw new RuntimeException("AI service timed out. Please try again.");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.severe("[SambaNova] Error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            throw new RuntimeException("AI service error. Please try again.");
        }
    }

    // ─── HELPERS ──────────────────────────────────────────────────────────────

    private String formatAnswer(String raw) {
        if (raw == null) return "";
        return raw.replaceAll("\\n{3,}", "\n\n")
                .replaceAll("(?m)^([•\\-\\*])\\s+", "\n• ")
                .replaceAll("(?m)^(\\d+\\.\\s)", "\n$1")
                .trim();
    }

    private String trim(String input, int max) {
        if (input == null) return "";
        String t = input.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }
}
