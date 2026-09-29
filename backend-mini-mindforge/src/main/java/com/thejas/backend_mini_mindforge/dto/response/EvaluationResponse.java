package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.ExamAttempt;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class EvaluationResponse {

    private Long attemptId;
    private Long examId;
    private String status;
    private Integer totalMarks;
    private Double score;
    private Double percentage;
    private Boolean passed;
    private LocalDateTime evaluatedAt;

    public static EvaluationResponse from(ExamAttempt a, int totalMarks) {
        EvaluationResponse r = new EvaluationResponse();
        r.attemptId = a.getId();
        r.examId = a.getExam().getId();
        r.status = a.getStatus().name();
        r.totalMarks = totalMarks;
        r.score = a.getScore();
        r.percentage = a.getPercentage();
        r.passed = a.getPassed();
        r.evaluatedAt = a.getEvaluatedAt();
        return r;
    }
}
