package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.BrainQuestion;
import com.thejas.backend_mini_mindforge.entity.Difficulty;

import java.util.List;

public class DailyWorkoutResponse {

    private List<BrainQuestion> questions;
    private boolean completed;
    private Difficulty difficulty;
    private int totalQuestions;
    private int answeredCount;
    private String message;

    public DailyWorkoutResponse(List<BrainQuestion> questions, boolean completed,
                                 Difficulty difficulty, int totalQuestions,
                                 int answeredCount, String message) {
        this.questions = questions;
        this.completed = completed;
        this.difficulty = difficulty;
        this.totalQuestions = totalQuestions;
        this.answeredCount = answeredCount;
        this.message = message;
    }

    public List<BrainQuestion> getQuestions() { return questions; }
    public boolean isCompleted() { return completed; }
    public Difficulty getDifficulty() { return difficulty; }
    public int getTotalQuestions() { return totalQuestions; }
    public int getAnsweredCount() { return answeredCount; }
    public String getMessage() { return message; }
}
