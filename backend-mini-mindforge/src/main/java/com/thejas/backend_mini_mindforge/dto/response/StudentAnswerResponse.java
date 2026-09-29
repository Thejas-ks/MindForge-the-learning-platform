package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.StudentAnswer;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class StudentAnswerResponse {

    private Long id;
    private Long attemptId;
    private Long bankQuestionId;
    private String questionType;
    private Long selectedOptionId;
    private List<Long> selectedOptionIds;
    private String textAnswer;
    private LocalDateTime answeredAt;
    private LocalDateTime lastSavedAt;
    private Double marksAwarded;
    private Boolean isCorrect;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static StudentAnswerResponse from(StudentAnswer a) {
        StudentAnswerResponse r = new StudentAnswerResponse();
        r.id = a.getId();
        r.attemptId = a.getAttempt().getId();
        r.bankQuestionId = a.getBankQuestion().getId();
        r.questionType = a.getBankQuestion().getQuestionType().name();
        r.selectedOptionId = a.getSelectedOptionId();
        r.selectedOptionIds = parseOptionIds(a.getSelectedOptionIds());
        r.textAnswer = a.getTextAnswer();
        r.answeredAt = a.getAnsweredAt();
        r.lastSavedAt = a.getLastSavedAt();
        r.marksAwarded = a.getMarksAwarded();
        r.isCorrect = a.getIsCorrect();
        r.createdAt = a.getCreatedAt();
        r.updatedAt = a.getUpdatedAt();
        return r;
    }

    private static List<Long> parseOptionIds(String raw) {
        if (raw == null || raw.isBlank()) return Collections.emptyList();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }
}
