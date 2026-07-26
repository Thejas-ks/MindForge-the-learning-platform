package com.thejas.backend_mini_mindforge.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "user_performance")
public class UserPerformance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    private Difficulty currentDifficulty = Difficulty.EASY;

    // Cumulative stats for difficulty calculation
    private int totalAnswered;
    private int totalCorrect;

    public Long getId() { return id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Difficulty getCurrentDifficulty() { return currentDifficulty; }
    public void setCurrentDifficulty(Difficulty currentDifficulty) { this.currentDifficulty = currentDifficulty; }

    public int getTotalAnswered() { return totalAnswered; }
    public void setTotalAnswered(int totalAnswered) { this.totalAnswered = totalAnswered; }

    public int getTotalCorrect() { return totalCorrect; }
    public void setTotalCorrect(int totalCorrect) { this.totalCorrect = totalCorrect; }

    public double getAccuracyPercent() {
        if (totalAnswered == 0) return 0;
        return (totalCorrect * 100.0) / totalAnswered;
    }
}
