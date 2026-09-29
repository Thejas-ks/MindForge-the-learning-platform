package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Teacher-only composite response for the exam preview page.
 *
 * Contains full exam metadata + enriched question list (with questionText and
 * answer options). This DTO is intentionally separate from ExamQuestionResponse
 * so we can include teacher-only fields (options with correct flags, questionText)
 * without touching the existing read/list endpoints.
 *
 * IMPORTANT: never expose this endpoint to students.
 */
@Data
@NoArgsConstructor
public class ExamPreviewResponse {

    // ── Exam metadata ─────────────────────────────────────────────────────────

    private Long id;
    private String title;
    private String description;
    private Integer durationMinutes;
    private Integer totalMarks;
    private Integer passMarks;
    private String status;
    private Integer maxAttempts;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ── Questions (teacher-enriched) ──────────────────────────────────────────

    private List<PreviewQuestion> questions;

    // ── Computed validation summary ───────────────────────────────────────────

    private int assignedQuestionCount;
    private int assignedMarksSum;
    private boolean marksMatch;
    private boolean hasQuestions;

    // ── Inner DTO ─────────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    public static class PreviewQuestion {

        private Long examQuestionId;
        private Long bankQuestionId;
        private String title;
        private String questionText;
        private String questionType;
        private String difficulty;
        private String topic;
        private Integer questionOrder;
        private Integer marksOverride;
        private Integer effectiveMarks;
        private String section;
        private Boolean mandatory;
        private Boolean isDraft;
        private List<PreviewOption> options;

        public static PreviewQuestion from(ExamQuestion eq) {
            PreviewQuestion q = new PreviewQuestion();
            BankQuestion bq = eq.getBankQuestion();

            q.examQuestionId   = eq.getId();
            q.bankQuestionId   = bq.getId();
            q.title            = bq.getTitle();
            q.questionText     = bq.getQuestionText();
            q.questionType     = bq.getQuestionType().name();
            q.difficulty       = bq.getDifficulty().name();
            q.topic            = bq.getTopic();
            q.questionOrder    = eq.getQuestionOrder();
            q.marksOverride    = eq.getMarksOverride();
            q.effectiveMarks   = eq.getMarksOverride() != null
                                     ? eq.getMarksOverride()
                                     : bq.getMarks();
            q.section          = eq.getSection().name();
            q.mandatory        = eq.getMandatory();
            q.isDraft          = bq.getIsDraft();
            q.options          = bq.getOptions().stream()
                                     .map(PreviewOption::from)
                                     .collect(Collectors.toList());
            return q;
        }
    }

    @Data
    @NoArgsConstructor
    public static class PreviewOption {

        private Long id;
        private String optionText;
        private Boolean correct;   // teacher preview may show correct answer
        private Integer displayOrder;

        public static PreviewOption from(QuestionOption opt) {
            PreviewOption po = new PreviewOption();
            po.id           = opt.getId();
            po.optionText   = opt.getOptionText();
            po.correct      = opt.getCorrect();
            po.displayOrder = opt.getDisplayOrder();
            return po;
        }
    }

    // ── Factory ───────────────────────────────────────────────────────────────

    public static ExamPreviewResponse from(Exam exam, List<ExamQuestion> examQuestions) {
        ExamPreviewResponse r = new ExamPreviewResponse();

        r.id              = exam.getId();
        r.title           = exam.getTitle();
        r.description     = exam.getDescription();
        r.durationMinutes = exam.getDurationMinutes();
        r.totalMarks      = exam.getTotalMarks();
        r.passMarks       = exam.getPassMarks();
        r.status          = exam.getStatus().name();
        r.maxAttempts     = exam.getMaxAttempts();
        r.startTime       = exam.getStartTime();
        r.endTime         = exam.getEndTime();
        r.createdAt       = exam.getCreatedAt();
        r.updatedAt       = exam.getUpdatedAt();

        r.questions = examQuestions.stream()
                          .map(PreviewQuestion::from)
                          .collect(Collectors.toList());

        // Computed summary
        r.assignedQuestionCount = examQuestions.size();
        r.hasQuestions          = !examQuestions.isEmpty();
        r.assignedMarksSum      = examQuestions.stream()
                                      .mapToInt(eq -> eq.getMarksOverride() != null
                                                      ? eq.getMarksOverride()
                                                      : eq.getBankQuestion().getMarks())
                                      .sum();
        r.marksMatch = (r.assignedMarksSum == exam.getTotalMarks());

        return r;
    }
}
