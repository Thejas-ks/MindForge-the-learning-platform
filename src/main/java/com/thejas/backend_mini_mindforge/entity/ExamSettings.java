package com.thejas.backend_mini_mindforge.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "exam_settings")
@Data
@NoArgsConstructor
public class ExamSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false, unique = true)
    private Exam exam;

    @Column(nullable = false)
    private boolean shuffleQuestions = false;

    @Column(nullable = false)
    private boolean shuffleOptions = false;

    @Column(nullable = false)
    private boolean allowReviewAfterSubmission = true;

    @Column(nullable = false)
    private boolean allowQuestionNavigation = true;

    @Column(nullable = false)
    private boolean showResultImmediately = true;

    @Column(nullable = false)
    private boolean negativeMarkingEnabled = false;

    @Column(nullable = false)
    private double negativeMarksPerWrongAnswer = 0.0;

    @Column(nullable = false)
    private boolean fullscreenRequired = false;

    @Column(nullable = false)
    private boolean allowCalculator = false;

    @Column(nullable = false)
    private boolean autoSubmitOnTimeout = true;

    @Column(nullable = false)
    private boolean allowTabSwitch = false;

    @Column(nullable = false)
    private int maxTabSwitchViolations = 3;

    @Column(nullable = false)
    private boolean allowCopyPaste = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SecurityLevel securityLevel = SecurityLevel.MEDIUM;
}
