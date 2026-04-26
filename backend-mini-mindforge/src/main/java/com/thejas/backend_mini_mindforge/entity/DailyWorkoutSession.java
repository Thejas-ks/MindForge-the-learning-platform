package com.thejas.backend_mini_mindforge.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "daily_workout_sessions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"email", "sessionDate"}))
public class DailyWorkoutSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    private LocalDate sessionDate;

    // Comma-separated question IDs served today
    @Column(length = 500)
    private String questionIds;

    private boolean completed;

    private int totalQuestions;
    private int correctAnswers;
    private int answeredCount;

    public Long getId() { return id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public LocalDate getSessionDate() { return sessionDate; }
    public void setSessionDate(LocalDate sessionDate) { this.sessionDate = sessionDate; }

    public String getQuestionIds() { return questionIds; }
    public void setQuestionIds(String questionIds) { this.questionIds = questionIds; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }

    public int getCorrectAnswers() { return correctAnswers; }
    public void setCorrectAnswers(int correctAnswers) { this.correctAnswers = correctAnswers; }

    public int getAnsweredCount() { return answeredCount; }
    public void setAnsweredCount(int answeredCount) { this.answeredCount = answeredCount; }

    public List<Long> getQuestionIdList() {
        if (questionIds == null || questionIds.isBlank()) return List.of();
        List<Long> ids = new java.util.ArrayList<>();
        for (String s : questionIds.split(",")) {
            try { ids.add(Long.parseLong(s.trim())); } catch (NumberFormatException ignored) {}
        }
        return ids;
    }
}
