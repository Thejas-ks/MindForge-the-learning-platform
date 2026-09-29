package com.thejas.backend_mini_mindforge.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "exam_questions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_exam_bank_question",
        columnNames = {"exam_id", "bank_question_id"}
    )
)
@Data
@NoArgsConstructor
public class ExamQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_question_id", nullable = false)
    private BankQuestion bankQuestion;

    // Position of this question within the exam
    @Column(nullable = false)
    private Integer questionOrder;

    // If null, use bankQuestion.marks at runtime
    private Integer marksOverride;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExamSection section = ExamSection.GENERAL;

    @Column(nullable = false)
    private Boolean mandatory = false;
}
