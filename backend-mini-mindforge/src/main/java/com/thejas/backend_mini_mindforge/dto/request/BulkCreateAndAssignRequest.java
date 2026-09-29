package com.thejas.backend_mini_mindforge.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request body for POST /api/exams/{examId}/questions/bulk-create.
 * Creates Question Bank questions and assigns them to the exam atomically.
 */
@Data
@NoArgsConstructor
public class BulkCreateAndAssignRequest {

    /** Each entry is a full question definition + optional exam-specific config. */
    private List<QuestionEntry> questions;

    @Data
    @NoArgsConstructor
    public static class QuestionEntry {
        // ── Question Bank fields ──────────────────────────────────────────────
        private String title;
        private String questionText;
        private String questionType;
        private String difficulty;
        private String topic;
        private Integer marks;
        private Integer estimatedTimeSeconds;
        private String explanation;
        private List<QuestionOptionRequest> options;

        // ── Exam-specific config (ExamQuestion fields) ────────────────────────
        private Integer marksOverride;   // null = use marks above
        private String  section;         // null = GENERAL
        private Boolean mandatory;       // null = false

        // ── Draft resume: ID of existing BankQuestion draft to finalize ───────
        // null = create a new question; non-null = finalize the existing draft
        private Long draftId;
    }
}
