package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.ExamAttempt;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class ExamAttemptResponse {

    private Long id;
    private Long examId;
    private String examTitle;
    private Long studentId;
    private String studentEmail;
    private Integer attemptNumber;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime evaluatedAt;
    private LocalDateTime endsAt;
    private Integer timeTakenSeconds;
    private Double score;
    private Double percentage;
    private Boolean passed;
    private Integer remainingAttempts;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ExamAttemptResponse from(ExamAttempt a, int remainingAttempts) {
        ExamAttemptResponse r = new ExamAttemptResponse();
        r.id = a.getId();
        r.examId = a.getExam().getId();
        r.examTitle = a.getExam().getTitle();
        r.studentId = a.getStudent().getId();
        r.studentEmail = a.getStudent().getEmail();
        r.attemptNumber = a.getAttemptNumber();
        r.status = a.getStatus().name();
        r.startedAt = a.getStartedAt();
        r.submittedAt = a.getSubmittedAt();
        r.evaluatedAt = a.getEvaluatedAt();
        r.endsAt = a.getStartedAt().plusMinutes(a.getExam().getDurationMinutes());
        r.timeTakenSeconds = a.getTimeTakenSeconds();
        r.score = a.getScore();
        r.percentage = a.getPercentage();
        r.passed = a.getPassed();
        r.remainingAttempts = remainingAttempts;
        r.createdAt = a.getCreatedAt();
        r.updatedAt = a.getUpdatedAt();
        return r;
    }
}
