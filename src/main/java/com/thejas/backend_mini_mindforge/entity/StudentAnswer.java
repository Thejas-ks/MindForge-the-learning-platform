package com.thejas.backend_mini_mindforge.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "student_answers",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_attempt_bank_question",
        columnNames = {"attempt_id", "bank_question_id"}
    )
)
@Data
@NoArgsConstructor
public class StudentAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private ExamAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_question_id", nullable = false)
    private BankQuestion bankQuestion;

    // For MCQ_SINGLE and TRUE_FALSE
    private Long selectedOptionId;

    // For MCQ_MULTIPLE — stored as comma-separated option IDs e.g. "1,3,7"
    @Column(length = 1000)
    private String selectedOptionIds;

    // For SHORT_ANSWER, LONG_ANSWER, FILL_BLANK
    @Column(length = 5000)
    private String textAnswer;

    @Column(nullable = false)
    private LocalDateTime answeredAt;

    @Column(nullable = false)
    private LocalDateTime lastSavedAt;

    // Populated during evaluation phase only
    private Double marksAwarded;

    private Boolean isCorrect;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
