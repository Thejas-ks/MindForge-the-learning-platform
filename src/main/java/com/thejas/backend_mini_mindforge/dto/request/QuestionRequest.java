package com.thejas.backend_mini_mindforge.dto.request;

import java.util.List;
import java.util.Map;

public class QuestionRequest {

    private String question;

    // Last 5-10 messages: [{ "role": "user"/"assistant", "content": "..." }]
    private List<Map<String, String>> history;

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public List<Map<String, String>> getHistory() { return history; }
    public void setHistory(List<Map<String, String>> history) { this.history = history; }
}
